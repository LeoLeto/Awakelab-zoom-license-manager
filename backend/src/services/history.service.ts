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
      const historyEntry = new History({
        entityType: options.entityType,
        entityId: typeof options.entityId === 'string' 
          ? new Types.ObjectId(options.entityId) 
          : options.entityId,
        action: options.action,
        actor: options.actor || 'system',
        changes: options.changes,
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
      const assignmentHistory = await History.find({
        entityType: 'assignment',
        'changes.field': 'licenseId',
        $or: [
          { 'changes.oldValue': objectId },
          { 'changes.newValue': objectId }
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
   * Compare two objects and extract changes
   */
  static extractChanges(
    oldObj: any,
    newObj: any,
    fieldsToTrack: string[]
  ): { field: string; oldValue: any; newValue: any }[] {
    const changes: { field: string; oldValue: any; newValue: any }[] = [];

    for (const field of fieldsToTrack) {
      const oldValue = oldObj?.[field];
      const newValue = newObj?.[field];

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
