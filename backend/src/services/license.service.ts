import { License, ILicense } from '../models/License.model';
import { Assignment, IAssignment } from '../models/Assignment.model';
import { Types } from 'mongoose';
import { startOfDay, endOfDay } from 'date-fns';
import { HistoryService } from './history.service';

export class LicenseService {
  /**
   * Get all licenses
   */
  async getAllLicenses(): Promise<ILicense[]> {
    return await License.find().sort({ createdAt: -1 });
  }

  /**
   * Get license by ID
   */
  async getLicenseById(id: string): Promise<ILicense | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('ID de licencia inválido');
    }
    return await License.findById(id);
  }

  /**
   * Get license by email
   */
  async getLicenseByEmail(email: string): Promise<ILicense | null> {
    return await License.findOne({ email: email.toLowerCase() });
  }

  /**
   * Get licenses by status
   */
  async getLicensesByStatus(estado: 'libre' | 'ocupado' | 'mantenimiento'): Promise<ILicense[]> {
    return await License.find({ estado }).sort({ createdAt: -1 });
  }

  /**
   * Create a new license
   */
  async createLicense(licenseData: Partial<ILicense>, actor: string = 'system'): Promise<ILicense> {
    // Check if license with email already exists
    const existingLicense = await this.getLicenseByEmail(licenseData.email!);
    if (existingLicense) {
      throw new Error(`La licencia con email ${licenseData.email} ya existe`);
    }

    const license = new License(licenseData);
    const savedLicense = await license.save();

    // Record history
    await HistoryService.recordChange({
      entityType: 'license',
      entityId: savedLicense._id,
      action: 'create',
      actor,
      changes: [
        { field: 'cuenta', newValue: savedLicense.cuenta },
        { field: 'email', newValue: savedLicense.email },
        { field: 'estado', newValue: savedLicense.estado },
      ],
      metadata: {
        licenseEmail: savedLicense.email,
      },
    });

    return savedLicense;
  }

  /**
   * Update license
   */
  async updateLicense(id: string, updateData: Partial<ILicense>, actor: string = 'system'): Promise<ILicense | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('ID de licencia inválido');
    }

    // Get the current license state before update
    const oldLicense = await License.findById(id);
    if (!oldLicense) {
      throw new Error('Licencia no encontrada');
    }

    // Prevent email updates to avoid duplicates
    if (updateData.email) {
      const existingLicense = await License.findOne({ 
        email: updateData.email.toLowerCase(),
        _id: { $ne: id }
      });
      if (existingLicense) {
        throw new Error(`Otra licencia con email ${updateData.email} ya existe`);
      }
    }

    const updatedLicense = await License.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (updatedLicense) {
      // Track fields that might change
      const fieldsToTrack = [
        'cuenta', 'usuarioMoodle', 'email', 'claveAnfitrionZoom',
        'claveUsuarioMoodle', 'passwordZoom', 'passwordEmail',
        'estado', 'observaciones'
      ];

      const changes = HistoryService.extractChanges(
        oldLicense.toObject(),
        updatedLicense.toObject(),
        fieldsToTrack
      );

      if (changes.length > 0) {
        // Determine the action type
        const action = changes.some(c => c.field === 'estado') ? 'status_change' : 'update';

        await HistoryService.recordChange({
          entityType: 'license',
          entityId: updatedLicense._id,
          action,
          actor,
          changes,
          metadata: {
            licenseEmail: updatedLicense.email,
          },
        });
      }
    }

    return updatedLicense;
  }

  /**
   * Delete license
   */
  async deleteLicense(id: string, actor: string = 'system'): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('ID de licencia inválido');
    }

    // Check for active assignments
    const activeAssignments = await Assignment.find({
      licenseId: new Types.ObjectId(id),
      estado: 'activo'
    });

    if (activeAssignments.length > 0) {
      throw new Error('No se puede eliminar una licencia con asignaciones activas');
    }

    const license = await License.findById(id);
    if (!license) {
      return false;
    }

    const result = await License.findByIdAndDelete(id);

    if (result) {
      // Record history
      await HistoryService.recordChange({
        entityType: 'license',
        entityId: new Types.ObjectId(id),
        action: 'delete',
        actor,
        changes: [
          { field: 'cuenta', oldValue: license.cuenta },
          { field: 'email', oldValue: license.email },
          { field: 'estado', oldValue: license.estado },
        ],
        metadata: {
          licenseEmail: license.email,
        },
      });
    }

    return result !== null;
  }

  /**
   * Get available licenses for a date range
   */
  async getAvailableLicenses(startDate: Date, endDate: Date): Promise<ILicense[]> {
    // Get all free licenses
    const freeLicenses = await License.find({ estado: 'libre' });

    // Get licenses that are occupied but don't have overlapping assignments
    const occupiedLicenses = await License.find({ estado: 'ocupado' });

    const availableLicenses: ILicense[] = [...freeLicenses];

    for (const license of occupiedLicenses) {
      const overlappingAssignments = await Assignment.find({
        licenseId: license._id,
        estado: 'activo',
        $or: [
          {
            fechaInicioUso: { $lte: endDate },
            fechaFinUso: { $gte: startDate }
          }
        ]
      });

      if (overlappingAssignments.length === 0) {
        availableLicenses.push(license);
      }
    }

    return availableLicenses;
  }

  /**
   * Get license with current assignment
   */
  async getLicenseWithAssignment(id: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('ID de licencia inválido');
    }

    const license = await License.findById(id);
    if (!license) {
      return null;
    }

    const currentAssignment = await Assignment.findOne({
      licenseId: new Types.ObjectId(id),
      estado: 'activo',
      fechaInicioUso: { $lte: new Date() },
      fechaFinUso: { $gte: new Date() }
    });

    return {
      license: license.toObject(),
      assignment: currentAssignment?.toObject() || null
    };
  }

  /**
   * Get all licenses with their current assignments
   */
  async getAllLicensesWithAssignments(): Promise<any[]> {
    const licenses = await License.find().sort({ createdAt: -1 });
    const now = new Date();

    const licensesWithAssignments = await Promise.all(
      licenses.map(async (license) => {
        const currentAssignment = await Assignment.findOne({
          licenseId: license._id,
          estado: 'activo',
          fechaFinUso: { $gte: now }
        });

        return {
          license: license.toObject(),
          assignment: currentAssignment?.toObject() || null
        };
      })
    );

    return licensesWithAssignments;
  }
}

export const licenseService = new LicenseService();
