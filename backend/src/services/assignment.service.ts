import { Assignment, IAssignment } from '../models/Assignment.model';
import { License } from '../models/License.model';
import { Types } from 'mongoose';

export class AssignmentService {
  /**
   * Get all assignments
   */
  async getAllAssignments(): Promise<IAssignment[]> {
    return await Assignment.find()
      .populate('licenseId')
      .sort({ createdAt: -1 });
  }

  /**
   * Get assignment by ID
   */
  async getAssignmentById(id: string): Promise<IAssignment | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid assignment ID');
    }
    return await Assignment.findById(id).populate('licenseId');
  }

  /**
   * Get assignments for a license
   */
  async getAssignmentsByLicense(licenseId: string): Promise<IAssignment[]> {
    if (!Types.ObjectId.isValid(licenseId)) {
      throw new Error('Invalid license ID');
    }
    return await Assignment.find({ licenseId: new Types.ObjectId(licenseId) })
      .sort({ createdAt: -1 });
  }

  /**
   * Get active assignments
   */
  async getActiveAssignments(): Promise<IAssignment[]> {
    const now = new Date();
    return await Assignment.find({
      estado: 'activo',
      fechaInicioUso: { $lte: now },
      fechaFinUso: { $gte: now }
    })
      .populate('licenseId')
      .sort({ fechaFinUso: 1 });
  }

  /**
   * Get assignments by teacher email
   */
  async getAssignmentsByTeacher(email: string): Promise<IAssignment[]> {
    return await Assignment.find({ 
      correocorporativo: email.toLowerCase() 
    })
      .populate('licenseId')
      .sort({ createdAt: -1 });
  }

  /**
   * Create a new assignment
   */
  async createAssignment(assignmentData: Partial<IAssignment>): Promise<IAssignment> {
    // Validate license exists
    const license = await License.findById(assignmentData.licenseId);
    if (!license) {
      throw new Error('License not found');
    }

    // Check if license is available for the requested dates
    const overlappingAssignments = await Assignment.find({
      licenseId: assignmentData.licenseId,
      estado: 'activo',
      $or: [
        {
          fechaInicioUso: { $lte: assignmentData.fechaFinUso },
          fechaFinUso: { $gte: assignmentData.fechaInicioUso }
        }
      ]
    });

    if (overlappingAssignments.length > 0) {
      throw new Error('License is not available for the requested date range');
    }

    const assignment = new Assignment(assignmentData);
    const savedAssignment = await assignment.save();

    // Update license status to 'ocupado'
    await License.findByIdAndUpdate(
      assignmentData.licenseId,
      { $set: { estado: 'ocupado' } }
    );

    return savedAssignment;
  }

  /**
   * Update assignment
   */
  async updateAssignment(id: string, updateData: Partial<IAssignment>): Promise<IAssignment | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid assignment ID');
    }

    const existingAssignment = await Assignment.findById(id);
    if (!existingAssignment) {
      throw new Error('Assignment not found');
    }

    // If dates are being updated, check for conflicts
    if (updateData.fechaInicioUso || updateData.fechaFinUso) {
      const startDate = updateData.fechaInicioUso || existingAssignment.fechaInicioUso;
      const endDate = updateData.fechaFinUso || existingAssignment.fechaFinUso;

      const overlappingAssignments = await Assignment.find({
        _id: { $ne: id },
        licenseId: existingAssignment.licenseId,
        estado: 'activo',
        $or: [
          {
            fechaInicioUso: { $lte: endDate },
            fechaFinUso: { $gte: startDate }
          }
        ]
      });

      if (overlappingAssignments.length > 0) {
        throw new Error('Updated dates conflict with existing assignments');
      }
    }

    return await Assignment.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('licenseId');
  }

  /**
   * Cancel assignment
   */
  async cancelAssignment(id: string): Promise<IAssignment | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid assignment ID');
    }

    const assignment = await Assignment.findByIdAndUpdate(
      id,
      { $set: { estado: 'cancelado' } },
      { new: true }
    ).populate('licenseId');

    if (assignment) {
      // Check if there are other active assignments for this license
      const activeAssignments = await Assignment.find({
        licenseId: assignment.licenseId,
        estado: 'activo',
        _id: { $ne: id }
      });

      // If no other active assignments, set license to 'libre'
      if (activeAssignments.length === 0) {
        await License.findByIdAndUpdate(
          assignment.licenseId,
          { $set: { estado: 'libre' } }
        );
      }
    }

    return assignment;
  }

  /**
   * Delete assignment
   */
  async deleteAssignment(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid assignment ID');
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return false;
    }

    const result = await Assignment.findByIdAndDelete(id);

    if (result) {
      // Check if there are other active assignments for this license
      const activeAssignments = await Assignment.find({
        licenseId: assignment.licenseId,
        estado: 'activo'
      });

      // If no other active assignments, set license to 'libre'
      if (activeAssignments.length === 0) {
        await License.findByIdAndUpdate(
          assignment.licenseId,
          { $set: { estado: 'libre' } }
        );
      }
    }

    return result !== null;
  }

  /**
   * Mark expired assignments
   * This should be called by a cron job
   */
  async markExpiredAssignments(): Promise<number> {
    const now = new Date();
    
    const result = await Assignment.updateMany(
      {
        estado: 'activo',
        fechaFinUso: { $lt: now }
      },
      {
        $set: { estado: 'expirado' }
      }
    );

    // Update license status for expired assignments
    const expiredAssignments = await Assignment.find({
      estado: 'expirado',
      fechaFinUso: { $lt: now }
    });

    for (const assignment of expiredAssignments) {
      const activeAssignments = await Assignment.find({
        licenseId: assignment.licenseId,
        estado: 'activo'
      });

      if (activeAssignments.length === 0) {
        await License.findByIdAndUpdate(
          assignment.licenseId,
          { $set: { estado: 'libre' } }
        );
      }
    }

    return result.modifiedCount;
  }

  /**
   * Get assignments expiring soon (within X days)
   */
  async getExpiringAssignments(daysAhead: number = 7): Promise<IAssignment[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return await Assignment.find({
      estado: 'activo',
      fechaFinUso: {
        $gte: now,
        $lte: futureDate
      }
    })
      .populate('licenseId')
      .sort({ fechaFinUso: 1 });
  }
}

export const assignmentService = new AssignmentService();
