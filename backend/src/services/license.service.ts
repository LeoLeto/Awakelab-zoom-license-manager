import { License, ILicense } from '../models/License.model';
import { Assignment, IAssignment } from '../models/Assignment.model';
import { Types } from 'mongoose';
import { startOfDay, endOfDay } from 'date-fns';

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
      throw new Error('Invalid license ID');
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
  async createLicense(licenseData: Partial<ILicense>): Promise<ILicense> {
    // Check if license with email already exists
    const existingLicense = await this.getLicenseByEmail(licenseData.email!);
    if (existingLicense) {
      throw new Error(`License with email ${licenseData.email} already exists`);
    }

    const license = new License(licenseData);
    return await license.save();
  }

  /**
   * Update license
   */
  async updateLicense(id: string, updateData: Partial<ILicense>): Promise<ILicense | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid license ID');
    }

    // Prevent email updates to avoid duplicates
    if (updateData.email) {
      const existingLicense = await License.findOne({ 
        email: updateData.email.toLowerCase(),
        _id: { $ne: id }
      });
      if (existingLicense) {
        throw new Error(`Another license with email ${updateData.email} already exists`);
      }
    }

    return await License.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  /**
   * Delete license
   */
  async deleteLicense(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid license ID');
    }

    // Check for active assignments
    const activeAssignments = await Assignment.find({
      licenseId: new Types.ObjectId(id),
      estado: 'activo'
    });

    if (activeAssignments.length > 0) {
      throw new Error('Cannot delete license with active assignments');
    }

    const result = await License.findByIdAndDelete(id);
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
      throw new Error('Invalid license ID');
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
          fechaInicioUso: { $lte: now },
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
