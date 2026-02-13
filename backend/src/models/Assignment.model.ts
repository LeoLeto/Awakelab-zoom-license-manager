import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAssignment extends Document {
  _id: Types.ObjectId;
  licenseId: Types.ObjectId;
  nombreApellidos: string;
  correocorporativo: string;
  area: string;
  comunidadAutonoma: string;
  tipoUso: string;
  fechaInicioUso: Date;
  fechaFinUso: Date;
  estado: 'activo' | 'expirado' | 'cancelado';
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    licenseId: {
      type: Schema.Types.ObjectId,
      ref: 'License',
      required: true,
      index: true,
    },
    nombreApellidos: {
      type: String,
      required: true,
      trim: true,
    },
    correocorporativo: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    area: {
      type: String,
      required: true,
      trim: true,
    },
    comunidadAutonoma: {
      type: String,
      required: true,
      trim: true,
    },
    tipoUso: {
      type: String,
      required: true,
      trim: true,
    },
    fechaInicioUso: {
      type: Date,
      required: true,
    },
    fechaFinUso: {
      type: Date,
      required: true,
    },
    estado: {
      type: String,
      enum: ['activo', 'expirado', 'cancelado'],
      default: 'activo',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'assignments',
  }
);

// Indexes for better query performance
AssignmentSchema.index({ correocorporativo: 1 });
AssignmentSchema.index({ estado: 1 });
AssignmentSchema.index({ fechaInicioUso: 1, fechaFinUso: 1 });

// Compound index for finding active assignments in date range
AssignmentSchema.index({ 
  estado: 1, 
  fechaInicioUso: 1, 
  fechaFinUso: 1 
});

export const Assignment = mongoose.model<IAssignment>('Assignment', AssignmentSchema);
