import { Types } from 'mongoose';
import { History, IHistoryEntry } from '../models/History.model';

interface RecordChangeOptions {
  entityType: 'license' | 'assignment' | 'setting';
  entityId: Types.ObjectId | string;
  action: 'create' | 'update' | 'delete' | 'assign' | 'unassign' | 'status_change';
  actor?: string;
  changes: {
    field: string;
    oldValue?: any;
    newValue?: any;
  }[];
  metadata?: {
    licenseEmail?: string;
    assignmentName?: string;
    reason?: string;
  };
}

export class HistoryService {
  /**
   * Record a change in the history
   */
  static async recordChange(options: RecordChangeOptions): Promise<IHistoryEntry> {
    try {
      // Filter out changes where both sides are empty/null/undefined string
      const meaningfulChanges = options.changes.filter((c) => {
        const oldEmpty = c.oldValue === null || c.oldValue === undefined || c.oldValue === '';
        const newEmpty = c.newValue === null || c.newValue === undefined || c.newValue === '';
        return !(oldEmpty && newEmpty);
      });

      // Skip recording if there are no meaningful changes
      if (meaningfulChanges.length === 0) {
        // Return a dummy entry (not saved) to satisfy the return type
        return new History({ ...options, changes: [] });
      }

      const historyEntry = new History({
        entityType: options.entityType,
        entityId: typeof options.entityId === 'string' 
          ? new Types.ObjectId(options.entityId) 
          : options.entityId,
        action: options.action,
        actor: options.actor || 'system',
        changes: meaningfulChanges,
        metadata: options.metadata,
        timestamp: new Date(),
      });

      await historyEntry.save();
      return historyEntry;
    } catch (error) {
      console.error('Error recording history:', error);
      throw error;
    }
  }

  /**
   * Get history for a specific entity
   */
  static async getEntityHistory(
    entityType: 'license' | 'assignment' | 'setting',
    entityId: Types.ObjectId | string,
    limit: number = 50
  ): Promise<IHistoryEntry[]> {
    try {
      const objectId = typeof entityId === 'string' 
        ? new Types.ObjectId(entityId) 
        : entityId;

      return await History.find({
        entityType,
        entityId: objectId,
      })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean()
        .exec() as any;
    } catch (error) {
      console.error('Error fetching entity history:', error);
      throw error;
    }
  }

  /**
   * Get recent history across all entities
   */
  static async getRecentHistory(
    limit: number = 100,
    filters?: {
      entityType?: 'license' | 'assignment' | 'setting';
      action?: string;
      actor?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<IHistoryEntry[]> {
    try {
      const query: any = {};

      if (filters?.entityType) {
        query.entityType = filters.entityType;
      }
      if (filters?.action) {
        query.action = filters.action;
      }
      if (filters?.actor) {
        query.actor = filters.actor;
      }
      if (filters?.startDate || filters?.endDate) {
        query.timestamp = {};
        if (filters.startDate) {
          query.timestamp.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.timestamp.$lte = filters.endDate;
        }
      }

      return await History.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean()
        .exec() as any;
    } catch (error) {
      console.error('Error fetching recent history:', error);
      throw error;
    }
  }

  /**
   * Get history for a specific license including its assignments
   */
  static async getLicenseFullHistory(
    licenseId: Types.ObjectId | string,
    limit: number = 100
  ): Promise<IHistoryEntry[]> {
    try {
      const objectId = typeof licenseId === 'string' 
        ? new Types.ObjectId(licenseId) 
        : licenseId;

      // Get both license history and assignment history for this license
      const licenseHistory = await this.getEntityHistory('license', objectId, limit);
      
      // Get assignments history that reference this license
      // Match both ObjectId form and string form (normalizeValue stores IDs as strings)
      const licenseIdStr = objectId.toString();
      const assignmentHistory = await History.find({
        entityType: 'assignment',
        'changes.field': 'licenseId',
        $or: [
          { 'changes.oldValue': objectId },
          { 'changes.newValue': objectId },
          { 'changes.oldValue': licenseIdStr },
          { 'changes.newValue': licenseIdStr },
        ]
      })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean()
        .exec() as any;

      // Combine and sort by timestamp
      const combined = [...licenseHistory, ...assignmentHistory];
      combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return combined.slice(0, limit);
    } catch (error) {
      console.error('Error fetching license full history:', error);
      throw error;
    }
  }

  /**
   * Normalize a value for history storage.
   * Converts ObjectIds and populated Mongoose documents to their string _id,
   * so that history entries always store plain scalars rather than full objects.
   */
  static normalizeValue(value: any): any {
    if (value === null || value === undefined) return value;
    // ObjectId instance (has a .toString that returns the hex string)
    if (value && typeof value === 'object' && value.constructor?.name === 'ObjectId') {
      return value.toString();
    }
    // Populated Mongoose document / plain object with _id  →  keep only the id
    if (value && typeof value === 'object' && !Array.isArray(value) && value._id) {
      return value._id.toString();
    }
    return value;
  }

  /**
   * Compare two objects and extract changes
   */
  static extractChanges(
    oldObj: any,
    newObj: any,
    fieldsToTrack: string[]
  ): { field: string; oldValue: any; newValue: any }[] {
    const changes: { field: string; oldValue: any; newValue: any }[] = [];

    for (const field of fieldsToTrack) {
      const oldValue = HistoryService.normalizeValue(oldObj?.[field]);
      const newValue = HistoryService.normalizeValue(newObj?.[field]);

      // Convert to string for comparison to handle different types
      const oldStr = JSON.stringify(oldValue);
      const newStr = JSON.stringify(newValue);

      if (oldStr !== newStr) {
        changes.push({
          field,
          oldValue,
          newValue,
        });
      }
    }

    return changes;
  }

  /**
   * Delete history older than specified days
   */
  static async cleanupOldHistory(daysToKeep: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await History.deleteMany({
        timestamp: { $lt: cutoffDate },
      });

      return result.deletedCount || 0;
    } catch (error) {
      console.error('Error cleaning up old history:', error);
      throw error;
    }
  }
}
