// Assignment dates are stored as UTC day boundaries (00:00 / 23:59:59.999Z),
// so read them in UTC: in Spain the end date showed up as the next day.
const DATE_OPTS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  timeZone: 'UTC',
};

const DATETIME_OPTS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
};

export function formatDate(value: string | Date | undefined | null): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('es-ES', DATE_OPTS);
}

export function formatDateTime(value: string | Date | undefined | null): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('es-ES', DATETIME_OPTS);
}
