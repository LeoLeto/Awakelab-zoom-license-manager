import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IHistoryEntry extends Document {
  _id: Types.ObjectId;
  entityType: 'license' | 'assignment';
  entityId: Types.ObjectId;
  action: 'create' | 'update' | 'delete' | 'assign' | 'unassign' | 'status_change';
  actor?: string; // User who made the change (email or system)
  changes: {
    field: string;
    oldValue?: any;
    newValue?: any;
  }[];
  metadata?: {
    licenseEmail?: string; // For easier reference
    assignmentName?: string; // For easier reference
    reason?: string; // Optional reason for the change
  };
  timestamp: Date;
  createdAt: Date;
}

const HistorySchema = new Schema<IHistoryEntry>(
  {
    entityType: {
      type: String,
      enum: ['license', 'assignment'],
      required: true,
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['create', 'update', 'delete', 'assign', 'unassign', 'status_change'],
      required: true,
      index: true,
    },
    actor: {
      type: String,
      trim: true,
      default: 'system',
    },
    changes: [
      {
        field: {
          type: String,
          required: true,
        },
        oldValue: {
          type: Schema.Types.Mixed,
        },
        newValue: {
          type: Schema.Types.Mixed,
        },
      },
    ],
    metadata: {
      licenseEmail: {
        type: String,
        trim: true,
      },
      assignmentName: {
        type: String,
        trim: true,
      },
      reason: {
        type: String,
        trim: true,
      },
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'history',
  }
);

// Compound indexes for efficient querying
HistorySchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
HistorySchema.index({ timestamp: -1 });
HistorySchema.index({ actor: 1, timestamp: -1 });

export const History = mongoose.model<IHistoryEntry>('History', HistorySchema);
