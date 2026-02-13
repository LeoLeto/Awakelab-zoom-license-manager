export interface License {
  _id: string;
  cuenta: string;
  usuarioMoodle: string;
  email: string;
  claveAnfitrionZoom: string;
  claveUsuarioMoodle: string;
  passwordZoom: string;
  passwordEmail: string;
  estado: 'libre' | 'ocupado' | 'mantenimiento';
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  _id: string;
  licenseId: string;
  nombreApellidos: string;
  correocorporativo: string;
  area: string;
  comunidadAutonoma: string;
  tipoUso: string;
  fechaInicioUso: string;
  fechaFinUso: string;
  estado: 'activo' | 'expirado' | 'cancelado';
  createdAt: string;
  updatedAt: string;
}

export interface LicenseWithAssignment {
  license: License;
  assignment: Assignment | null;
}

export interface CreateLicenseDto {
  cuenta: string;
  usuarioMoodle: string;
  email: string;
  claveAnfitrionZoom: string;
  claveUsuarioMoodle: string;
  passwordZoom: string;
  passwordEmail: string;
  estado: 'libre' | 'ocupado' | 'mantenimiento';
  observaciones?: string;
}

export interface CreateAssignmentDto {
  licenseId: string;
  nombreApellidos: string;
  correocorporativo: string;
  area: string;
  comunidadAutonoma: string;
  tipoUso: string;
  fechaInicioUso: string;
  fechaFinUso: string;
}
