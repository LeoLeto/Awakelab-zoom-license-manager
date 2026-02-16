import { Assignment, IAssignment } from '../models/Assignment.model';
import { License } from '../models/License.model';
import { Types } from 'mongoose';
import { HistoryService } from './history.service';

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
   * Get pending assignments (awaiting license assignment)
   */
  async getPendingAssignments(): Promise<IAssignment[]> {
    return await Assignment.find({
      estado: 'pendiente'
    })
      .sort({ createdAt: -1 });
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
  async createAssignment(assignmentData: Partial<IAssignment>, actor: string = 'system'): Promise<IAssignment> {
    // If licenseId is provided, validate and check availability
    if (assignmentData.licenseId) {
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
    }

    // Set estado based on whether licenseId is provided
    const estado = assignmentData.licenseId ? 'activo' : 'pendiente';
    
    const assignment = new Assignment({
      ...assignmentData,
      estado
    });
    const savedAssignment = await assignment.save();

    // Update license status to 'ocupado' only if licenseId is provided
    if (assignmentData.licenseId) {
      await License.findByIdAndUpdate(
        assignmentData.licenseId,
        { $set: { estado: 'ocupado' } }
      );

      // Record assignment action
      await HistoryService.recordChange({
        entityType: 'assignment',
        entityId: savedAssignment._id,
        action: 'assign',
        actor,
        changes: [
          { field: 'licenseId', newValue: assignmentData.licenseId },
          { field: 'nombreApellidos', newValue: savedAssignment.nombreApellidos },
          { field: 'estado', newValue: estado },
          { field: 'fechaInicioUso', newValue: savedAssignment.fechaInicioUso },
          { field: 'fechaFinUso', newValue: savedAssignment.fechaFinUso },
        ],
        metadata: {
          assignmentName: savedAssignment.nombreApellidos,
        },
      });
    } else {
      // Record create action for pending assignment
      await HistoryService.recordChange({
        entityType: 'assignment',
        entityId: savedAssignment._id,
        action: 'create',
        actor,
        changes: [
          { field: 'nombreApellidos', newValue: savedAssignment.nombreApellidos },
          { field: 'estado', newValue: estado },
          { field: 'fechaInicioUso', newValue: savedAssignment.fechaInicioUso },
          { field: 'fechaFinUso', newValue: savedAssignment.fechaFinUso },
        ],
        metadata: {
          assignmentName: savedAssignment.nombreApellidos,
        },
      });
    }

    return savedAssignment;
  }

  /**
   * Update assignment
   */
  async updateAssignment(id: string, updateData: Partial<IAssignment>, actor: string = 'system'): Promise<IAssignment | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid assignment ID');
    }

    const existingAssignment = await Assignment.findById(id);
    if (!existingAssignment) {
      throw new Error('Assignment not found');
    }

    const oldLicenseId = existingAssignment.licenseId;
    let isAssigningLicense = false;

    // If licenseId is being assigned (for pending requests)
    if (updateData.licenseId && !existingAssignment.licenseId) {
      isAssigningLicense = true;
      
      // Validate license exists
      const license = await License.findById(updateData.licenseId);
      if (!license) {
        throw new Error('License not found');
      }

      // Check if license is available for the assignment dates
      const overlappingAssignments = await Assignment.find({
        _id: { $ne: id },
        licenseId: updateData.licenseId,
        estado: 'activo',
        $or: [
          {
            fechaInicioUso: { $lte: existingAssignment.fechaFinUso },
            fechaFinUso: { $gte: existingAssignment.fechaInicioUso }
          }
        ]
      });

      if (overlappingAssignments.length > 0) {
        throw new Error('License is not available for the requested date range');
      }

      // Update license status to ocupado
      await License.findByIdAndUpdate(
        updateData.licenseId,
        { $set: { estado: 'ocupado' } }
      );

      // Set estado to 'activo' when assigning a license
      updateData.estado = 'activo';
    }

    // If dates are being updated, check for conflicts
    if (updateData.fechaInicioUso || updateData.fechaFinUso) {
      const startDate = updateData.fechaInicioUso || existingAssignment.fechaInicioUso;
      const endDate = updateData.fechaFinUso || existingAssignment.fechaFinUso;
      const licenseToCheck = updateData.licenseId || existingAssignment.licenseId;

      if (licenseToCheck) {
        const overlappingAssignments = await Assignment.find({
          _id: { $ne: id },
          licenseId: licenseToCheck,
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
    }

    const updatedAssignment = await Assignment.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('licenseId');

    if (updatedAssignment) {
      // Track changes
      const fieldsToTrack = [
        'licenseId', 'nombreApellidos', 'correocorporativo', 'area',
        'comunidadAutonoma', 'tipoUso', 'fechaInicioUso', 'fechaFinUso', 'estado'
      ];

      const changes = HistoryService.extractChanges(
        existingAssignment.toObject(),
        updatedAssignment.toObject(),
        fieldsToTrack
      );

      if (changes.length > 0) {
        // Determine action type
        let action: 'update' | 'assign' | 'unassign' | 'status_change' = 'update';
        
        if (isAssigningLicense) {
          action = 'assign';
        } else if (changes.some(c => c.field === 'licenseId')) {
          action = oldLicenseId ? 'unassign' : 'assign';
        } else if (changes.some(c => c.field === 'estado')) {
          action = 'status_change';
        }

        await HistoryService.recordChange({
          entityType: 'assignment',
          entityId: updatedAssignment._id,
          action,
          actor,
          changes,
          metadata: {
            assignmentName: updatedAssignment.nombreApellidos,
          },
        });
      }
    }

    return updatedAssignment;
  }

  /**
   * Cancel assignment
   */
  async cancelAssignment(id: string, actor: string = 'system'): Promise<IAssignment | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid assignment ID');
    }

    const existingAssignment = await Assignment.findById(id);
    if (!existingAssignment) {
      return null;
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

      // Record history
      await HistoryService.recordChange({
        entityType: 'assignment',
        entityId: assignment._id,
        action: 'status_change',
        actor,
        changes: [
          { field: 'estado', oldValue: existingAssignment.estado, newValue: 'cancelado' },
        ],
        metadata: {
          assignmentName: assignment.nombreApellidos,
          reason: 'Assignment cancelled',
        },
      });
    }

    return assignment;
  }

  /**
   * Delete assignment
   */
  async deleteAssignment(id: string, actor: string = 'system'): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid assignment ID');
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return false;
    }

    const result = await Assignment.findByIdAndDelete(id);

    if (result) {
      // Record history
      await HistoryService.recordChange({
        entityType: 'assignment',
        entityId: new Types.ObjectId(id),
        action: 'delete',
        actor,
        changes: [
          { field: 'nombreApellidos', oldValue: assignment.nombreApellidos },
          { field: 'estado', oldValue: assignment.estado },
        ],
        metadata: {
          assignmentName: assignment.nombreApellidos,
        },
      });

      // Check if there are other active assignments for this license
      const activeAssignments = await Assignment.find({
        licenseId: assignment.licenseId,
        estado: 'activo'
      });

      // If no other active assignments, set license to 'libre'
      if (activeAssignments.length === 0 && assignment.licenseId) {
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
