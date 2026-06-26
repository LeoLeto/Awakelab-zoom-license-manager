import { License, ILicense } from '../models/License.model';
import { Assignment, IAssignment } from '../models/Assignment.model';
import { Types } from 'mongoose';
import { startOfDay, endOfDay } from 'date-fns';
import { HistoryService } from './history.service';
import { emailService } from './email.service';

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
   * Force-free an occupied license (admin override, used in rare cases).
   * Cancels any active assignment(s) tied to the license (the teacher loses
   * access) and sets the license back to 'libre'. Returns the freed license
   * together with how many assignments were cancelled.
   */
  async freeLicense(
    id: string,
    actor: string = 'system'
  ): Promise<{ license: ILicense; cancelledCount: number }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('ID de licencia inválido');
    }

    const license = await License.findById(id);
    if (!license) {
      throw new Error('Licencia no encontrada');
    }

    if (license.estado === 'libre') {
      throw new Error('La licencia ya está disponible');
    }

    // Cancel any active assignment(s) (current or upcoming) using this license.
    const activeAssignments = await Assignment.find({
      licenseId: new Types.ObjectId(id),
      estado: 'activo',
    });

    for (const assignment of activeAssignments) {
      // Use findByIdAndUpdate (not .save()) so Mongoose only touches `estado`
      // and does NOT full-document-validate legacy fields such as a `tipoUso`
      // value that predates the current enum. Matches cancelAssignment().
      await Assignment.findByIdAndUpdate(assignment._id, { $set: { estado: 'cancelado' } });

      await HistoryService.recordChange({
        entityType: 'assignment',
        entityId: assignment._id,
        action: 'status_change',
        actor,
        changes: [{ field: 'estado', oldValue: 'activo', newValue: 'cancelado' }],
        metadata: {
          assignmentName: assignment.nombreApellidos,
          reason: 'Cancelada al liberar la licencia (acción manual de administrador)',
        },
      });

      // Notify the affected teacher that their access was revoked.
      // Email failures must not block the release operation.
      try {
        await emailService.sendAssignmentCancelled({
          teacherName: assignment.nombreApellidos,
          teacherEmail: assignment.correocorporativo,
          licenseEmail: license.email,
          startDate: new Date(assignment.fechaInicioUso).toLocaleDateString('es-CL'),
          endDate: new Date(assignment.fechaFinUso).toLocaleDateString('es-CL'),
        });
      } catch (error: any) {
        console.error(
          `Failed to send cancellation email to ${assignment.correocorporativo}:`,
          error.message
        );
      }
    }

    const oldEstado = license.estado;
    const updatedLicense = await License.findByIdAndUpdate(
      license._id,
      { $set: { estado: 'libre' } },
      { new: true }
    );

    await HistoryService.recordChange({
      entityType: 'license',
      entityId: license._id,
      action: 'status_change',
      actor,
      changes: [{ field: 'estado', oldValue: oldEstado, newValue: 'libre' }],
      metadata: {
        licenseEmail: license.email,
        reason: `Liberación forzada de licencia (acción manual de administrador)${
          activeAssignments.length > 0
            ? `; se canceló${activeAssignments.length === 1 ? '' : 'n'} ${activeAssignments.length} asignación(es) activa(s)`
            : ''
        }`,
      },
    });

    return { license: updatedLicense ?? license, cancelledCount: activeAssignments.length };
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
    // Run all three queries in parallel instead of N+1 sequential round-trips:
    // 1. All libre licenses
    // 2. All ocupado licenses
    // 3. All occupied license IDs that have a conflicting active assignment (single query)
    const [freeLicenses, occupiedLicenses, conflictingAssignments] = await Promise.all([
      License.find({ estado: 'libre' }).lean(),
      License.find({ estado: 'ocupado' }).lean(),
      Assignment.find({
        estado: 'activo',
        fechaInicioUso: { $lte: endDate },
        fechaFinUso: { $gte: startDate }
      }, { licenseId: 1 }).lean()  // only fetch licenseId — minimises data transfer
    ]);

    // Build a Set of occupied licenseIds for O(1) lookup
    const conflictingIds = new Set(
      conflictingAssignments
        .filter((a) => a.licenseId != null)
        .map((a) => a.licenseId!.toString())
    );

    // Free licenses with a future active booking (estado still 'libre' because start >48h away)
    // must also be excluded if they conflict with the requested period.
    const freeAndAvailable = freeLicenses.filter(
      (l) => !conflictingIds.has((l._id as any).toString())
    );

    // Occupied licenses with NO conflicting assignment are also available
    const occupiedButAvailable = occupiedLicenses.filter(
      (l) => !conflictingIds.has((l._id as any).toString())
    );

    return [...freeAndAvailable, ...occupiedButAvailable] as unknown as ILicense[];
  }

  /**
   * Get license with current assignment
   */
  async getLicenseWithAssignment(id: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('ID de licencia inválido');
    }

    const [license, currentAssignment] = await Promise.all([
      License.findById(id).lean(),
      Assignment.findOne({
        licenseId: new Types.ObjectId(id),
        estado: 'activo',
        fechaInicioUso: { $lte: new Date() },
        fechaFinUso: { $gte: new Date() }
      }).lean()
    ]);

    if (!license) {
      return null;
    }

    return {
      license,
      assignment: currentAssignment || null
    };
  }

  /**
   * Get all licenses with their current assignments
   */
  async getAllLicensesWithAssignments(): Promise<any[]> {
    const now = new Date();

    // Fetch licenses and active assignments in parallel (2 queries total, instead of N+1)
    // .lean() returns plain JS objects instead of Mongoose Documents — significantly faster
    const [licenses, activeAssignments] = await Promise.all([
      License.find().sort({ createdAt: -1 }).lean(),
      Assignment.find({ estado: 'activo', fechaFinUso: { $gte: now } }).lean()
    ]);

    // Build a Map from licenseId -> assignment for O(1) lookup
    const assignmentByLicenseId = new Map(
      activeAssignments
        .filter((a) => a.licenseId != null)
        .map((a) => [a.licenseId!.toString(), a])
    );

    return licenses.map((license) => ({
      license,
      assignment: assignmentByLicenseId.get((license._id as any).toString()) ?? null
    }));
  }

  /**
   * Update passwordZoom and passwordEmail for a license identified by its Zoom email.
   * Used to keep the DB in sync after a Zoom API password change.
   */
  async updatePasswordByEmail(email: string, newPassword: string): Promise<void> {
    const result = await License.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $set: { passwordZoom: newPassword, passwordEmail: newPassword } }
    );
    if (!result) {
      throw new Error(`No license found with email ${email}`);
    }
  }
}

export const licenseService = new LicenseService();
