import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  key: string;
  value: any;
  description?: string;
  updatedAt: Date;
  updatedBy?: string;
}

const SettingsSchema = new Schema<ISettings>({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: String,
    default: 'system'
  }
});

// Update the updatedAt timestamp before saving
SettingsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Settings = mongoose.model<ISettings>('Settings', SettingsSchema);
