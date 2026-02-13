import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILicense extends Document {
  _id: Types.ObjectId;
  cuenta: string;
  usuarioMoodle: string;
  email: string;
  claveAnfitrionZoom: string;
  claveUsuarioMoodle: string;
  passwordZoom: string;
  passwordEmail: string;
  estado: 'libre' | 'ocupado' | 'mantenimiento';
  observaciones?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LicenseSchema = new Schema<ILicense>(
  {
    cuenta: {
      type: String,
      required: true,
      trim: true,
    },
    usuarioMoodle: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    claveAnfitrionZoom: {
      type: String,
      required: true,
    },
    claveUsuarioMoodle: {
      type: String,
      required: true,
    },
    passwordZoom: {
      type: String,
      required: true,
    },
    passwordEmail: {
      type: String,
      required: true,
    },
    estado: {
      type: String,
      enum: ['libre', 'ocupado', 'mantenimiento'],
      default: 'libre',
      required: true,
    },
    observaciones: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'licenses',
  }
);

// Indexes for better query performance
LicenseSchema.index({ estado: 1 });
LicenseSchema.index({ cuenta: 1 });

export const License = mongoose.model<ILicense>('License', LicenseSchema);
