import { useState } from 'react';
import { assignmentApi, licenseApi } from '../services/api.service';
import { License, Assignment } from '../types/license.types';

interface TeacherRequestFormProps {
  onSuccess?: () => void;
}

const EMPTY_NUEVA_FORM = {
  nombreApellidos: '',
  correocorporativo: '',
  area: '',
  comunidadAutonoma: '',
  tipoUso: '',
  fechaInicioUso: '',
  fechaFinUso: '',
};

export default function TeacherRequestForm({ onSuccess }: TeacherRequestFormProps) {
  const [tipoSolicitud, setTipoSolicitud] = useState('');

  // ── "Nueva aula Zoom" state ───────────────────────────────────────────────
  const [formData, setFormData] = useState(EMPTY_NUEVA_FORM);
  const [availableLicenses, setAvailableLicenses] = useState<License[]>([]);
  const [hasChecked, setHasChecked] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // ── "Ampliación" state ────────────────────────────────────────────────────
  const [ampliacionEmail, setAmpliacionEmail] = useState('');
  const [searchingAssignments, setSearchingAssignments] = useState(false);
  const [foundAssignments, setFoundAssignments] = useState<Assignment[]>([]);
  const [assignmentSearchDone, setAssignmentSearchDone] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [nuevaFechaFin, setNuevaFechaFin] = useState('');
  const [checkingExtension, setCheckingExtension] = useState(false);
  const [extensionAvailable, setExtensionAvailable] = useState<boolean | null>(null);
  const [extensionMessage, setExtensionMessage] = useState('');

  // ── Shared state ──────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const resetAmpliacionState = () => {
    setAmpliacionEmail('');
    setFoundAssignments([]);
    setAssignmentSearchDone(false);
    setSelectedAssignment(null);
    setNuevaFechaFin('');
    setExtensionAvailable(null);
    setExtensionMessage('');
  };

  const resetNuevaState = () => {
    setFormData(EMPTY_NUEVA_FORM);
    setAvailableLicenses([]);
    setHasChecked(false);
  };

  const handleTipoChange = (value: string) => {
    setTipoSolicitud(value);
    setError(null);
    resetAmpliacionState();
    resetNuevaState();
  };

  // ── Ampliación: search assignments by email ───────────────────────────────
  const searchAssignments = async () => {
    if (!ampliacionEmail.trim()) return;

    try {
      setSearchingAssignments(true);
      setError(null);
      setFoundAssignments([]);
      setSelectedAssignment(null);
      setNuevaFechaFin('');
      setExtensionAvailable(null);

      const response = await assignmentApi.getAssignmentsByEmail(ampliacionEmail.trim());
      setFoundAssignments(response.assignments);
      setAssignmentSearchDone(true);

      // Auto-select if only one result
      if (response.assignments.length === 1) {
        setSelectedAssignment(response.assignments[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar asignaciones');
      setAssignmentSearchDone(true);
    } finally {
      setSearchingAssignments(false);
    }
  };

  // ── Ampliación: check extension availability ──────────────────────────────
  const checkExtension = async (assignmentId: string, newDate: string) => {
    if (!assignmentId || !newDate) return;

    try {
      setCheckingExtension(true);
      setExtensionAvailable(null);
      setExtensionMessage('');

      const result = await assignmentApi.checkExtensionAvailability(assignmentId, newDate);
      setExtensionAvailable(result.available);
      setExtensionMessage(result.message ?? '');
    } catch (err) {
      setExtensionAvailable(false);
      setExtensionMessage(err instanceof Error ? err.message : 'Error al verificar disponibilidad');
    } finally {
      setCheckingExtension(false);
    }
  };

  const handleSelectAssignment = (a: Assignment) => {
    setSelectedAssignment(a);
    setNuevaFechaFin('');
    setExtensionAvailable(null);
    setExtensionMessage('');
  };

  const handleNuevaFechaFinChange = (value: string) => {
    setNuevaFechaFin(value);
    setExtensionAvailable(null);
    setExtensionMessage('');
    if (selectedAssignment && value) {
      checkExtension(selectedAssignment._id, value);
    }
  };

  // ── "Nueva aula Zoom" availability check ─────────────────────────────────
  const checkAvailability = async () => {
    if (!formData.fechaInicioUso || !formData.fechaFinUso) return;

    try {
      setCheckingAvailability(true);
      setError(null);
      const response = await licenseApi.getAvailableLicenses(
        formData.fechaInicioUso,
        formData.fechaFinUso
      );
      setAvailableLicenses(response.availableLicenses);
      setHasChecked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar disponibilidad');
      setAvailableLicenses([]);
      setHasChecked(true);
    } finally {
      setCheckingAvailability(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      if (tipoSolicitud === 'Ampliación o modificación de un aula Zoom previamente asignada') {
        if (!selectedAssignment || !nuevaFechaFin) return;

        // Compute fechaInicioUso for the extension: day after the existing assignment ends
        const currentEnd = new Date(selectedAssignment.fechaFinUso);
        currentEnd.setDate(currentEnd.getDate() + 1);
        const extensionStart = currentEnd.toISOString().split('T')[0];

        await assignmentApi.createAssignment({
          nombreApellidos: selectedAssignment.nombreApellidos,
          correocorporativo: selectedAssignment.correocorporativo,
          area: selectedAssignment.area,
          comunidadAutonoma: selectedAssignment.comunidadAutonoma,
          tipoUso: selectedAssignment.tipoUso,
          fechaInicioUso: extensionStart,
          fechaFinUso: nuevaFechaFin,
        });
      } else {
        await assignmentApi.createAssignment(formData);
      }

      setSuccess(true);
      setTipoSolicitud('');
      resetNuevaState();
      resetAmpliacionState();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear solicitud de licencia');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="card success-message">
        <h3>✅ ¡Solicitud de Licencia Enviada Exitosamente!</h3>
        <p>
          Tu solicitud ha sido enviada al administrador y está pendiente de aprobación. Te
          notificaremos cuando se te asigne una licencia.
        </p>
        <button onClick={() => setSuccess(false)} className="btn-primary">
          Enviar Otra Solicitud
        </button>
      </div>
    );
  }

  // ── Helpers for Ampliación display ────────────────────────────────────────
  const isAmpliacion =
    tipoSolicitud === 'Ampliación o modificación de un aula Zoom previamente asignada';

  const formatDate = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString('es-ES') : '—';

  const minNewEndDate = selectedAssignment
    ? (() => {
        const d = new Date(selectedAssignment.fechaFinUso);
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
      })()
    : new Date().toISOString().split('T')[0];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="teacher-request-form">
      <div className="card">
        <h2>📝 Solicitar una Licencia de Zoom</h2>
        <p className="form-description">
          Completa este formulario para solicitar una licencia de Zoom para tus necesidades
          docentes.
        </p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* ── Request Type ── */}
          <div className="form-section">
            <h3>Tipo de Solicitud</h3>
            <div className="form-group">
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="tipoSolicitud"
                    value="Nueva aula Zoom"
                    checked={tipoSolicitud === 'Nueva aula Zoom'}
                    onChange={(e) => handleTipoChange(e.target.value)}
                    required
                  />
                  <span>Nueva aula Zoom</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="tipoSolicitud"
                    value="Ampliación o modificación de un aula Zoom previamente asignada"
                    checked={isAmpliacion}
                    onChange={(e) => handleTipoChange(e.target.value)}
                    required
                  />
                  <span>Ampliación o modificación de un aula Zoom previamente asignada</span>
                </label>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════
              AMPLIACIÓN FLOW
          ════════════════════════════════════════════════════ */}
          {isAmpliacion && (
            <>
              {/* Step 1 – look up by email */}
              <div className="form-section">
                <h3>Paso 1 — Buscar tu asignación existente</h3>
                <div className="form-row" style={{ alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="ampliacionEmail">Email Corporativo *</label>
                    <input
                      id="ampliacionEmail"
                      type="email"
                      required={isAmpliacion}
                      value={ampliacionEmail}
                      onChange={(e) => {
                        setAmpliacionEmail(e.target.value);
                        setAssignmentSearchDone(false);
                        setFoundAssignments([]);
                        setSelectedAssignment(null);
                        setNuevaFechaFin('');
                        setExtensionAvailable(null);
                      }}
                      placeholder="tu.nombre@empresa.com"
                    />
                  </div>
                  <div className="form-group" style={{ flex: '0 0 auto' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={searchAssignments}
                      disabled={searchingAssignments || !ampliacionEmail.trim()}
                    >
                      {searchingAssignments ? 'Buscando...' : '🔍 Buscar'}
                    </button>
                  </div>
                </div>

                {/* No results */}
                {assignmentSearchDone && foundAssignments.length === 0 && (
                  <div
                    className="warning"
                    style={{
                      padding: '12px',
                      backgroundColor: '#fff3cd',
                      border: '1px solid #ffeeba',
                      borderRadius: '4px',
                      color: '#856404',
                      marginTop: '8px',
                    }}
                  >
                    ℹ️ No se encontraron asignaciones activas o expiradas con licencia asociada
                    para ese email. Verifica el email o solicita una nueva licencia.
                  </div>
                )}

                {/* Multiple results – let user pick */}
                {foundAssignments.length > 1 && (
                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label>Se encontraron varias asignaciones. Selecciona la que deseas ampliar:</label>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        marginTop: '8px',
                      }}
                    >
                      {foundAssignments.map((a) => (
                        <label
                          key={a._id}
                          className="radio-option"
                          style={{
                            padding: '10px 14px',
                            border: `2px solid ${selectedAssignment?._id === a._id ? '#0056b3' : '#dee2e6'}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            backgroundColor:
                              selectedAssignment?._id === a._id ? '#e8f0fe' : 'transparent',
                          }}
                        >
                          <input
                            type="radio"
                            name="selectedAssignment"
                            value={a._id}
                            checked={selectedAssignment?._id === a._id}
                            onChange={() => handleSelectAssignment(a)}
                          />
                          <span>
                            <strong>{a.tipoUso}</strong> — {a.area}
                            {a.comunidadAutonoma ? ` (${a.comunidadAutonoma})` : ''}{' '}
                            &nbsp;|&nbsp; {formatDate(a.fechaInicioUso)} → {formatDate(a.fechaFinUso)}{' '}
                            &nbsp;|&nbsp;{' '}
                            <span
                              style={{
                                color: a.estado === 'activo' ? '#28a745' : '#6c757d',
                                fontWeight: 600,
                              }}
                            >
                              {a.estado}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2 – show selected info + new end date */}
              {selectedAssignment && (
                <div className="form-section">
                  <h3>Paso 2 — Información de la asignación seleccionada</h3>

                  {/* Read-only summary */}
                  <div
                    style={{
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #dee2e6',
                      borderRadius: '6px',
                      padding: '16px',
                      marginBottom: '16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px 20px',
                        fontSize: '0.9rem',
                      }}
                    >
                      <div>
                        <span style={{ color: '#6c757d' }}>Nombre:</span>{' '}
                        <strong>{selectedAssignment.nombreApellidos}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#6c757d' }}>Email corporativo:</span>{' '}
                        <strong>{selectedAssignment.correocorporativo}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#6c757d' }}>Área:</span>{' '}
                        <strong>{selectedAssignment.area}</strong>
                      </div>
                      {selectedAssignment.comunidadAutonoma && (
                        <div>
                          <span style={{ color: '#6c757d' }}>CC.AA.:</span>{' '}
                          <strong>{selectedAssignment.comunidadAutonoma}</strong>
                        </div>
                      )}
                      <div>
                        <span style={{ color: '#6c757d' }}>Tipo de uso:</span>{' '}
                        <strong>{selectedAssignment.tipoUso}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#6c757d' }}>Período actual:</span>{' '}
                        <strong>
                          {formatDate(selectedAssignment.fechaInicioUso)} →{' '}
                          {formatDate(selectedAssignment.fechaFinUso)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* New end date */}
                  <div className="form-group">
                    <label htmlFor="nuevaFechaFin">Nueva fecha de fin *</label>
                    <input
                      id="nuevaFechaFin"
                      type="date"
                      required={isAmpliacion}
                      value={nuevaFechaFin}
                      min={minNewEndDate}
                      onChange={(e) => handleNuevaFechaFinChange(e.target.value)}
                    />
                    <small className="form-hint" style={{ display: 'block', marginTop: '4px' }}>
                      Debe ser posterior a la fecha de fin actual (
                      {formatDate(selectedAssignment.fechaFinUso)}).
                    </small>
                  </div>

                  {/* Extension availability feedback */}
                  {checkingExtension && (
                    <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                      ⏳ Verificando disponibilidad de la licencia...
                    </div>
                  )}

                  {!checkingExtension && extensionAvailable === true && (
                    <div
                      style={{
                        padding: '12px',
                        backgroundColor: '#d4edda',
                        border: '1px solid #c3e6cb',
                        borderRadius: '4px',
                        color: '#155724',
                        marginBottom: '8px',
                      }}
                    >
                      ✅ La licencia está disponible para el período de ampliación. Puedes enviar
                      la solicitud.
                    </div>
                  )}

                  {!checkingExtension && extensionAvailable === false && (
                    <div
                      style={{
                        padding: '12px',
                        backgroundColor: '#f8d7da',
                        border: '1px solid #f5c6cb',
                        borderRadius: '4px',
                        color: '#721c24',
                        marginBottom: '8px',
                      }}
                    >
                      ❌ {extensionMessage || 'La licencia no está disponible para ese período.'}{' '}
                      Debes <strong>solicitar una nueva licencia</strong> en su lugar.
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ════════════════════════════════════════════════════
              NUEVA AULA ZOOM FLOW
          ════════════════════════════════════════════════════ */}
          {tipoSolicitud === 'Nueva aula Zoom' && (
            <>
              {/* Personal Information */}
              <div className="form-section">
                <h3>Información Personal</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="nombreApellidos">Nombre Completo *</label>
                    <input
                      id="nombreApellidos"
                      type="text"
                      required
                      value={formData.nombreApellidos}
                      onChange={(e) =>
                        setFormData({ ...formData, nombreApellidos: e.target.value })
                      }
                      placeholder="Juan Pérez"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="correocorporativo">Email Corporativo *</label>
                    <input
                      id="correocorporativo"
                      type="email"
                      required
                      value={formData.correocorporativo}
                      onChange={(e) =>
                        setFormData({ ...formData, correocorporativo: e.target.value })
                      }
                      placeholder="juan.perez@ejemplo.com"
                    />
                  </div>
                </div>
              </div>

              {/* Work Information */}
              <div className="form-section">
                <h3>Información Laboral</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="area">Área/Departamento *</label>
                    <select
                      id="area"
                      required
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="DIRECCIÓN ESTRATÉGICA">DIRECCIÓN ESTRATÉGICA</option>
                      <option value="DIRECCIÓN ESTATAL">DIRECCIÓN ESTATAL</option>
                      <option value="DIRECCIÓN AUTONÓMICO">DIRECCIÓN AUTONÓMICO</option>
                      <option value="DIRECCIÓN NEGOCIO">DIRECCIÓN NEGOCIO</option>
                      <option value="ADMINISTRACIÓN">ADMINISTRACIÓN</option>
                      <option value="DIRECCIÓN F.PRIVADA">DIRECCIÓN F.PRIVADA</option>
                      <option value="DIRECCIÓN MARKETING">DIRECCIÓN MARKETING</option>
                      <option value="GERENCIA TRANSVERSAL">GERENCIA TRANSVERSAL</option>
                      <option value="GERENCIA TERRITORIAL">GERENCIA TERRITORIAL</option>
                      <option value="LATAM">LATAM</option>
                      <option value="AWAKELAB">AWAKELAB</option>
                      <option value="TALENTO E INOVACIÓN">TALENTO E INOVACIÓN</option>
                      <option value="FP-ASPASIA">FP-ASPASIA</option>
                      <option value="Otras">Otras</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="comunidadAutonoma">
                      Comunidad Autónoma (Sólo en el caso de Gerencias Territoriales)
                    </label>
                    <select
                      id="comunidadAutonoma"
                      value={formData.comunidadAutonoma}
                      onChange={(e) =>
                        setFormData({ ...formData, comunidadAutonoma: e.target.value })
                      }
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Andalucía">Andalucía</option>
                      <option value="Aragón">Aragón</option>
                      <option value="Asturias">Asturias</option>
                      <option value="Baleares">Baleares</option>
                      <option value="Canarias">Canarias</option>
                      <option value="Cantabria">Cantabria</option>
                      <option value="Castilla-La Mancha">Castilla-La Mancha</option>
                      <option value="Castilla y León">Castilla y León</option>
                      <option value="Cataluña">Cataluña</option>
                      <option value="Extremadura">Extremadura</option>
                      <option value="Galicia">Galicia</option>
                      <option value="La Rioja">La Rioja</option>
                      <option value="Madrid">Madrid</option>
                      <option value="Murcia">Murcia</option>
                      <option value="Navarra">Navarra</option>
                      <option value="País Vasco">País Vasco</option>
                      <option value="Valencia">Valencia</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="tipoUso">Uso de la licencia *</label>
                  <select
                    id="tipoUso"
                    required
                    value={formData.tipoUso}
                    onChange={(e) => setFormData({ ...formData, tipoUso: e.target.value })}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="USO NO ASOCIADO A PLATAFORMA">
                      USO NO ASOCIADO A PLATAFORMA
                    </option>
                    <option value="USO PARA UNA PLATAFORMA MOODLE DE GRUPO ASPASIA">
                      USO PARA UNA PLATAFORMA MOODLE DE GRUPO ASPASIA
                    </option>
                    <option value="WEBINAR para más de 300 personas">
                      WEBINAR para más de 300 personas
                    </option>
                  </select>
                </div>
              </div>

              {/* Date Range */}
              <div className="form-section">
                <h3>Período de Licencia</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="fechaInicioUso">Fecha de Inicio *</label>
                    <input
                      id="fechaInicioUso"
                      type="date"
                      required
                      value={formData.fechaInicioUso}
                      onChange={(e) => {
                        setFormData({ ...formData, fechaInicioUso: e.target.value });
                        setAvailableLicenses([]);
                        setHasChecked(false);
                      }}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="fechaFinUso">Fecha de Fin *</label>
                    <input
                      id="fechaFinUso"
                      type="date"
                      required
                      value={formData.fechaFinUso}
                      onChange={(e) => {
                        setFormData({ ...formData, fechaFinUso: e.target.value });
                        setAvailableLicenses([]);
                        setHasChecked(false);
                      }}
                      min={formData.fechaInicioUso || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                {formData.fechaInicioUso && formData.fechaFinUso && (
                  <div>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={checkAvailability}
                      disabled={checkingAvailability}
                    >
                      {checkingAvailability
                        ? 'Verificando...'
                        : '🔍 Verificar Disponibilidad (Opcional)'}
                    </button>
                    <small className="form-hint" style={{ display: 'block', marginTop: '8px' }}>
                      Esta verificación es solo informativa. Puedes enviar tu solicitud
                      independientemente de la disponibilidad.
                    </small>
                  </div>
                )}
              </div>

              {/* Availability feedback */}
              {hasChecked && availableLicenses.length > 0 && (
                <div
                  className="info"
                  style={{
                    padding: '12px',
                    backgroundColor: '#d4edda',
                    border: '1px solid #c3e6cb',
                    borderRadius: '4px',
                    color: '#155724',
                  }}
                >
                  ✅ Hay {availableLicenses.length} licencia(s) disponible(s) para tu período
                  seleccionado. El administrador asignará una de ellas a tu solicitud.
                </div>
              )}

              {hasChecked &&
                availableLicenses.length === 0 &&
                formData.fechaInicioUso &&
                formData.fechaFinUso &&
                !checkingAvailability && (
                  <div
                    className="warning"
                    style={{
                      padding: '12px',
                      backgroundColor: '#fff3cd',
                      border: '1px solid #ffeeba',
                      borderRadius: '4px',
                      color: '#856404',
                    }}
                  >
                    ℹ️ Actualmente no hay licencias disponibles para el período seleccionado, pero
                    puedes enviar tu solicitud de todos modos. El administrador gestionará la
                    asignación.
                  </div>
                )}
            </>
          )}

          {/* ── Submit ── */}
          {tipoSolicitud && (
            <div className="form-actions">
              <button
                type="submit"
                className="btn-primary"
                disabled={
                  loading ||
                  (isAmpliacion &&
                    (!selectedAssignment ||
                      !nuevaFechaFin ||
                      extensionAvailable !== true ||
                      checkingExtension))
                }
              >
                {loading ? 'Enviando...' : '🚀 Enviar Solicitud'}
              </button>
              {isAmpliacion && selectedAssignment && nuevaFechaFin && extensionAvailable !== true && !checkingExtension && (
                <small style={{ display: 'block', marginTop: '6px', color: '#6c757d' }}>
                  {extensionAvailable === false
                    ? 'No es posible enviar la solicitud porque la licencia no está disponible.'
                    : 'Esperando verificación de disponibilidad…'}
                </small>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
