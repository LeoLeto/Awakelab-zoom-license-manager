import { useEffect, useState } from 'react';
import { assignmentApi, settingsApi } from '../services/api.service';
import { Assignment, TIPO_USO_OPTIONS, displayTipoUso } from '../types/license.types';
import { formatDate } from '../utils/date';

const COMUNIDADES = [
  'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias', 'Cantabria', 'Castilla-La Mancha',
  'Castilla y León', 'Cataluña', 'Extremadura', 'Galicia', 'La Rioja', 'Madrid', 'Murcia',
  'Navarra', 'País Vasco', 'Valencia',
];

/** Stored dates are UTC day boundaries: the <input type="date"> value is the UTC day */
const toInputDay = (value: string | Date) => new Date(value).toISOString().slice(0, 10);

const hasStarted = (a: Assignment) => new Date(a.fechaInicioUso) <= new Date();

interface PanelProps {
  assignment: Assignment;
  licenseEmail: string;
  onDone: (message: string) => void;
  onCancel: () => void;
}

export function EditAssignmentPanel({ assignment, licenseEmail, onDone, onCancel }: PanelProps) {
  const [form, setForm] = useState({
    nombreApellidos: assignment.nombreApellidos,
    correocorporativo: assignment.correocorporativo,
    area: assignment.area,
    comunidadAutonoma: assignment.comunidadAutonoma || '',
    tipoUso: assignment.tipoUso as string,
    fechaInicioUso: toInputDay(assignment.fechaInicioUso),
    fechaFinUso: toInputDay(assignment.fechaFinUso),
  });
  const [notify, setNotify] = useState(true);
  const [areaOptions, setAreaOptions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    settingsApi
      .getSetting('areaDepartamento')
      .then((res) => {
        if (Array.isArray(res.value)) setAreaOptions(res.value);
      })
      .catch(() => setAreaOptions([]));
  }, []);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [field]: e.target.value });

  const recipientChanged =
    form.correocorporativo.trim().toLowerCase() !== assignment.correocorporativo.toLowerCase();
  const datesChanged =
    form.fechaInicioUso !== toInputDay(assignment.fechaInicioUso) ||
    form.fechaFinUso !== toInputDay(assignment.fechaFinUso);
  // Legacy tipoUso values are kept as they are unless the admin picks a new one
  const tipoUsoIsLegacy = !(TIPO_USO_OPTIONS as readonly string[]).includes(assignment.tipoUso);
  const areas = areaOptions.includes(assignment.area) ? areaOptions : [assignment.area, ...areaOptions];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { ...form, notify };
      if (tipoUsoIsLegacy && form.tipoUso === assignment.tipoUso) delete payload.tipoUso;
      const result = await assignmentApi.editAssignment(assignment._id, payload);
      const parts = ['Asignación actualizada.'];
      if (result.passwordRotated) parts.push('Se ha cambiado la contraseña de Zoom.');
      if (result.emailSent) {
        parts.push(
          result.credentialsPending
            ? `Se ha enviado la reserva a ${result.assignment.correocorporativo}; las claves llegarán 48 h antes del inicio.`
            : `Se ha enviado el correo con las claves a ${result.assignment.correocorporativo} (con copia a administración).`
        );
      } else if (recipientChanged || (datesChanged && notify)) {
        parts.push('El correo no se pudo enviar: revisa los logs de email.');
      }
      onDone(parts.join(' '));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="assignment-action-panel" onSubmit={handleSubmit}>
      <h4>Editar asignación · {licenseEmail}</h4>

      <div className="form-row">
        <div className="form-group">
          <label>Nombre y apellidos *</label>
          <input required value={form.nombreApellidos} onChange={set('nombreApellidos')} />
        </div>
        <div className="form-group">
          <label>Correo corporativo *</label>
          <input type="email" required value={form.correocorporativo} onChange={set('correocorporativo')} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Área/Departamento *</label>
          <select required value={form.area} onChange={set('area')}>
            {areas.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Comunidad Autónoma</label>
          <select value={form.comunidadAutonoma} onChange={set('comunidadAutonoma')}>
            <option value="">—</option>
            {COMUNIDADES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Tipo de uso *</label>
          <select required value={form.tipoUso} onChange={set('tipoUso')}>
            {tipoUsoIsLegacy && <option value={assignment.tipoUso}>{displayTipoUso(assignment.tipoUso)}</option>}
            {TIPO_USO_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Fecha de inicio *</label>
          <input type="date" required value={form.fechaInicioUso} onChange={set('fechaInicioUso')} />
        </div>
        <div className="form-group">
          <label>Fecha de fin *</label>
          <input type="date" required value={form.fechaFinUso} min={form.fechaInicioUso} onChange={set('fechaFinUso')} />
        </div>
      </div>

      {recipientChanged ? (
        <div className="panel-note warning">
          <strong>Cambia la persona asignada.</strong> {form.correocorporativo.trim() || 'La nueva persona'} recibirá
          el correo de asignación (con copia a administración). Si {assignment.correocorporativo} ya tenía las
          claves, se cambiará la contraseña de Zoom para que deje de tener acceso. A {assignment.correocorporativo} no
          se le envía ningún aviso.
        </div>
      ) : datesChanged ? (
        <label className="panel-check">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          Enviar a {assignment.correocorporativo} un correo con las nuevas fechas (con copia a administración)
        </label>
      ) : (
        <div className="panel-note">Si solo cambian el nombre, el área o el tipo de uso, no se envía ningún correo.</div>
      )}

      {error && <div className="error">{error}</div>}

      <div className="panel-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          Volver
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}

export function CancelAssignmentPanel({ assignment, licenseEmail, onDone, onCancel }: PanelProps) {
  const [notify, setNotify] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = hasStarted(assignment);
  const credentialsOut = assignment.credentialsSent !== false;

  const handleConfirm = async () => {
    setWorking(true);
    setError(null);
    try {
      const result = await assignmentApi.cancelAssignment(assignment._id, notify);
      const parts = [`Asignación de ${assignment.nombreApellidos} cancelada.`];
      if (result.passwordRotated) parts.push('Se ha cambiado la contraseña de Zoom.');
      if (result.rotationSkipped) parts.push(result.rotationSkipped);
      if (notify) {
        parts.push(result.emailSent ? 'Se le ha enviado el aviso (con copia a administración).' : 'El aviso no se pudo enviar: revisa los logs de email.');
      }
      onDone(parts.join(' '));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar la asignación');
      setWorking(false);
    }
  };

  return (
    <div className="assignment-action-panel danger">
      <h4>Cancelar asignación · {licenseEmail}</h4>
      <p>
        <strong>{assignment.nombreApellidos}</strong> ({assignment.correocorporativo})<br />
        {formatDate(assignment.fechaInicioUso)} – {formatDate(assignment.fechaFinUso)}{' '}
        <span className="text-muted">· {started ? 'en curso' : 'aún no ha empezado'}</span>
      </p>
      <ul>
        <li>Solo se cancela esta asignación; las demás de la licencia no cambian.</li>
        {credentialsOut ? (
          <li>Ya tiene las claves: se cambiará la contraseña de Zoom para que deje de tener acceso.</li>
        ) : (
          <li>Todavía no ha recibido las claves, así que la contraseña no se toca.</li>
        )}
      </ul>
      <label className="panel-check">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
        Avisar por correo a {assignment.correocorporativo} (con copia a administración)
      </label>

      {error && <div className="error">{error}</div>}

      <div className="panel-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={working}>
          Volver
        </button>
        <button type="button" className="btn-danger" onClick={handleConfirm} disabled={working}>
          {working ? 'Cancelando…' : 'Cancelar asignación'}
        </button>
      </div>
    </div>
  );
}
