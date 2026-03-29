import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAssignment extends Document {
  _id: Types.ObjectId;
  licenseId?: Types.ObjectId;
  nombreApellidos: string;
  correocorporativo: string;
  area: string;
  comunidadAutonoma?: string;
  tipoUso: 'Uso no asociado a plataforma' | 'Uso para una plataforma Moodle de Grupo Aspasia';
  fechaInicioUso: Date;
  fechaFinUso: Date;
  estado: 'activo' | 'expirado' | 'cancelado' | 'pendiente';
  credentialsSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    licenseId: {
      type: Schema.Types.ObjectId,
      ref: 'License',
      required: false,
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
    },
    area: {
      type: String,
      required: true,
      trim: true,
    },
    comunidadAutonoma: {
      type: String,
      required: false,
      trim: true,
    },
    tipoUso: {
      type: String,
      required: true,
      trim: true,
      enum: [
        'Uso no asociado a plataforma',
        'Uso para una plataforma Moodle de Grupo Aspasia',
      ],
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
      enum: ['activo', 'expirado', 'cancelado', 'pendiente'],
      default: 'pendiente',
      required: true,
    },
    credentialsSent: {
      type: Boolean,
      default: true,
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

// Optimized index for bulk active-assignment lookup (getAllLicensesWithAssignments)
AssignmentSchema.index({ estado: 1, fechaFinUso: 1 });

export const Assignment = mongoose.model<IAssignment>('Assignment', AssignmentSchema);
