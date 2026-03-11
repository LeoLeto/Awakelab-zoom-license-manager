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

export type TipoUso =
  | 'Uso no asociado a plataforma'
  | 'Uso para una plataforma Moodle de Grupo Aspasia';

export const TIPO_USO_OPTIONS: readonly TipoUso[] = [
  'Uso no asociado a plataforma',
  'Uso para una plataforma Moodle de Grupo Aspasia',
] as const;

/** Returns the value as-is for known values; appends a warning for unknown legacy values. */
export function displayTipoUso(value: string): string {
  if ((TIPO_USO_OPTIONS as readonly string[]).includes(value)) return value;
  return `${value} (⚠️ valor heredado)`;
}

export interface Assignment {
  _id: string;
  licenseId?: string | License;
  nombreApellidos: string;
  correocorporativo: string;
  area: string;
  comunidadAutonoma?: string;
  tipoUso: TipoUso | string; // string kept for legacy DB values rendered read-only
  fechaInicioUso: string;
  fechaFinUso: string;
  estado: 'activo' | 'expirado' | 'cancelado' | 'pendiente';
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
  licenseId?: string;
  nombreApellidos: string;
  correocorporativo: string;
  area: string;
  comunidadAutonoma?: string;
  tipoUso: TipoUso;
  fechaInicioUso: string;
  fechaFinUso: string;
}
