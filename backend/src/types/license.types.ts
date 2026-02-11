// License and Assignment Types

export interface License {
  id: number;
  cuenta: string; // Account name
  usuarioMoodle: string; // Moodle username
  email: string;
  claveAnfitrionZoom: string; // Zoom host key
  claveUsuarioMoodle: string; // Moodle user password
  passwordZoom: string;
  passwordEmail: string;
  estado: 'libre' | 'ocupado' | 'mantenimiento'; // free, occupied, maintenance
  observaciones?: string;
}

export interface Assignment {
  id: number;
  licenseId: number;
  nombreApellidos: string; // Teacher name
  correocorporativo: string; // Corporate email
  area: string;
  comunidadAutonoma: string;
  tipoUso: string; // Platform type
  fechaInicioUso: Date; // Start date
  fechaFinUso: Date; // End date
  estado: 'activo' | 'expirado' | 'cancelado';
  createdAt: Date;
  updatedAt: Date;
}

export interface LicenseRequest {
  teacherName: string;
  teacherEmail: string;
  area: string;
  comunidadAutonoma: string;
  platformType: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
}

export interface LicenseAssignment extends License {
  assignment?: Assignment;
}
