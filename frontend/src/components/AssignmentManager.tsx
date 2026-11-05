import { useState, useEffect, useMemo } from 'react';
import { assignmentApi, licenseApi, settingsApi } from '../services/api.service';
import { Assignment, License, TipoUso, TIPO_USO_OPTIONS, displayTipoUso } from '../types/license.types';
import { formatDate } from '../utils/date';

interface AssignmentManagerProps {
  onAssignmentChange?: () => void;
}

export default function AssignmentManager({ onAssignmentChange }: AssignmentManagerProps) {
  const [pendingAssignments, setPendingAssignments] = useState<Assignment[]>([]);
  const [availableLicenses, setAvailableLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [assigningTo, setAssigningTo] = useState<Assignment | null>(null);
  const [selectedLicenseForAssignment, setSelectedLicenseForAssignment] = useState<string>('');
  const [modalLoading, setModalLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [extensionOriginalLicense, setExtensionOriginalLicense] = useState<License | null>(null);
  const [forcePickLicense, setForcePickLicense] = useState(false);
  const [assignModalError, setAssignModalError] = useState<string | null>(null);
  const [areaOptions, setAreaOptions] = useState<string[]>([]);
  const [selectedLicenseIds, setSelectedLicenseIds] = useState<string[]>([]);
  const [licenseFilter, setLicenseFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombreApellidos: '',
    correocorporativo: '',
    area: '',
    comunidadAutonoma: '',
    tipoUso: '',
    fechaInicioUso: '',
    fechaFinUso: '',
  });

  const loadPendingAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await assignmentApi.getPendingAssignments();
      setPendingAssignments(response.assignments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar solicitudes pendientes');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableLicenses = async () => {
    if (!formData.fechaInicioUso || !formData.fechaFinUso) return;
    
    try {
      const response = await licenseApi.getAvailableLicenses(
        formData.fechaInicioUso,
        formData.fechaFinUso
      );
      setAvailableLicenses(response.availableLicenses);
      // Drop selections that are no longer available for the new dates
      const stillAvailable = new Set(response.availableLicenses.map((l) => l._id));
      setSelectedLicenseIds((ids) => ids.filter((id) => stillAvailable.has(id)));
    } catch (err) {
      console.error('Failed to load available licenses:', err);
      setAvailableLicenses([]);
      setSelectedLicenseIds([]);
    }
  };

  const loadAvailableLicensesForAssignment = async (assignment: Assignment) => {
    try {
      const response = await licenseApi.getAvailableLicenses(
        assignment.fechaInicioUso,
        assignment.fechaFinUso
      );
      setAvailableLicenses(response.availableLicenses);
    } catch (err) {
      console.error('Failed to load available licenses:', err);
      setAvailableLicenses([]);
    }
  };

  useEffect(() => {
    loadPendingAssignments();
    settingsApi.getSetting('areaDepartamento')
      .then((res) => {
        if (Array.isArray(res.value)) setAreaOptions(res.value);
      })
      .catch(() => setAreaOptions(['Otras']));
  }, []);

  useEffect(() => {
    if (showCreateForm) {
      loadAvailableLicenses();
    }
  }, [formData.fechaInicioUso, formData.fechaFinUso, showCreateForm]);

  const filteredLicenses = useMemo(() => {
    const q = licenseFilter.trim().toLowerCase();
    if (!q) return availableLicenses;
    return availableLicenses.filter(
      (l) => l.email.toLowerCase().includes(q) || (l.usuarioMoodle || '').toLowerCase().includes(q)
    );
  }, [availableLicenses, licenseFilter]);

  // Same 48h rule as the backend: start dates are stored as midnight UTC
  const startsWithin48h = useMemo(() => {
    if (!formData.fechaInicioUso) return null;
    const start = new Date(`${formData.fechaInicioUso}T00:00:00Z`).getTime();
    return start - Date.now() <= 48 * 60 * 60 * 1000;
  }, [formData.fechaInicioUso]);

  const toggleLicense = (id: string) => {
    setSelectedLicenseIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    setCreateError(null);
  };

  const selectAllFiltered = () => {
    setSelectedLicenseIds((ids) => [...new Set([...ids, ...filteredLicenses.map((l) => l._id)])]);
  };

  const resetCreateForm = () => {
    setFormData({
      nombreApellidos: '',
      correocorporativo: '',
      area: '',
      comunidadAutonoma: '',
      tipoUso: '',
      fechaInicioUso: '',
      fechaFinUso: '',
    });
    setSelectedLicenseIds([]);
    setLicenseFilter('');
    setCreateError(null);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLicenseIds.length === 0) {
      setCreateError('Selecciona al menos una licencia');
      return;
    }
    const n = selectedLicenseIds.length;
    if (n > 1 && !confirm(`Se asignarán ${n} licencias a ${formData.correocorporativo}. ¿Continuar?`)) {
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const result = await assignmentApi.createBulkAssignments({
        ...formData,
        tipoUso: formData.tipoUso as TipoUso,
        licenseIds: selectedLicenseIds,
      });
      const what = result.count === 1 ? '1 licencia asignada' : `${result.count} licencias asignadas`;
      setNotice(
        !result.emailSent
          ? `${what}, pero el correo no se pudo enviar. Revisa los logs de email y reenvíalo desde allí.`
          : result.credentialsPending
            ? `${what} a ${formData.correocorporativo}. Se ha enviado la reserva; las contraseñas se enviarán automáticamente unas 48 h antes del inicio.`
            : `${what} a ${formData.correocorporativo}. Se han renovado las contraseñas y se ha enviado un único correo con los datos de acceso (con copia a administración).`
      );
      setShowCreateForm(false);
      resetCreateForm();
      loadPendingAssignments();
      onAssignmentChange?.();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error al crear asignación');
    } finally {
      setCreating(false);
    }
  };

  const handleCancelAssignment = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres cancelar esta asignación?')) return;

    try {
      await assignmentApi.cancelAssignment(id);
      loadPendingAssignments();
      onAssignmentChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar asignación');
    }
  };

  const handleStartAssigning = async (assignment: Assignment) => {
    setAssigningTo(assignment);
    setSelectedLicenseForAssignment('');
    setExtensionOriginalLicense(null);
    setForcePickLicense(false);
    setModalLoading(true);

    if (assignment.isExtension && assignment.originalAssignmentId) {
      try {
        const res = await assignmentApi.getAssignmentById(assignment.originalAssignmentId);
        const origAssignment = res.assignment as Assignment & { licenseId?: any };
        const licenseId = typeof origAssignment.licenseId === 'object'
          ? origAssignment.licenseId?._id
          : origAssignment.licenseId;

        if (licenseId) {
          const licRes = await licenseApi.getLicenseById(licenseId);
          setExtensionOriginalLicense(licRes.license.license);
          setSelectedLicenseForAssignment(licenseId);
          setModalLoading(false);
          return; // skip loading the general available-license list
        }
      } catch {
        // original assignment not found — fall through to regular picker
      }
    }

    await loadAvailableLicensesForAssignment(assignment);
    setModalLoading(false);
  };

  const handleAssignLicense = async () => {
    if (!assigningTo || !selectedLicenseForAssignment) return;

    setAssigning(true);
    setAssignModalError(null);
    try {
      await assignmentApi.updateAssignment(assigningTo._id, {
        licenseId: selectedLicenseForAssignment
      });
      setAssigningTo(null);
      setSelectedLicenseForAssignment('');
      setAvailableLicenses([]);
      setAssignModalError(null);
      loadPendingAssignments();
      onAssignmentChange?.();
      setError(null);
    } catch (err) {
      setAssignModalError(err instanceof Error ? err.message : 'Error al asignar licencia');
    } finally {
      setAssigning(false);
    }
  };

  const handleCancelAssigning = () => {
    setAssigningTo(null);
    setSelectedLicenseForAssignment('');
    setAvailableLicenses([]);
    setExtensionOriginalLicense(null);
    setForcePickLicense(false);
    setAssignModalError(null);
  };

  if (loading) {
    return <div className="loading">Cargando solicitudes...</div>;
  }

  return (
    <>
    <div className="assignment-manager">
      <div className="section-header">
        <h2><img src="/icons/clipboard.png" className="icon-inline" alt="" /> Solicitudes y Nuevas Asignaciones</h2>
        <button
          className="btn-primary"
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setNotice(null);
          }}
        >
          {showCreateForm ? '✖ Cancelar' : '+ Nueva Asignación'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {notice && <div className="success">{notice}</div>}

      {/* Create Assignment Form */}
      {showCreateForm && (
        <div className="card">
          <h3>Crear Nueva Asignación</h3>
          <form onSubmit={handleCreateAssignment} className="assignment-form">
            <div className="form-row">
              <div className="form-group">
                <label>Nombre del Usuario *</label>
                <input
                  type="text"
                  required
                  value={formData.nombreApellidos}
                  onChange={(e) => setFormData({ ...formData, nombreApellidos: e.target.value })}
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="form-group">
                <label>Email Corporativo *</label>
                <input
                  type="email"
                  required
                  value={formData.correocorporativo}
                  onChange={(e) => setFormData({ ...formData, correocorporativo: e.target.value })}
                  placeholder="juan.perez@ejemplo.com"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Área/Departamento *</label>
                <select
                  required
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  {areaOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Comunidad Autónoma (Sólo en el caso de Gerencias Territoriales)</label>
                <select
                  value={formData.comunidadAutonoma}
                  onChange={(e) => setFormData({ ...formData, comunidadAutonoma: e.target.value })}
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

            <div className="form-row">
              <div className="form-group">
                <label>Tipo de Uso *</label>
                <select
                  required
                  value={formData.tipoUso}
                  onChange={(e) => setFormData({ ...formData, tipoUso: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  {TIPO_USO_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Fecha de Inicio *</label>
                <input
                  type="date"
                  required
                  value={formData.fechaInicioUso}
                  onChange={(e) => setFormData({ ...formData, fechaInicioUso: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Fecha de Fin *</label>
                <input
                  type="date"
                  required
                  value={formData.fechaFinUso}
                  onChange={(e) => setFormData({ ...formData, fechaFinUso: e.target.value })}
                  min={formData.fechaInicioUso}
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                Licencias *{' '}
                {selectedLicenseIds.length > 0 && (
                  <span className="form-hint" style={{ display: 'inline', marginLeft: 6 }}>
                    ({selectedLicenseIds.length} seleccionada{selectedLicenseIds.length !== 1 ? 's' : ''})
                  </span>
                )}
              </label>
              {!formData.fechaInicioUso || !formData.fechaFinUso ? (
                <div className="assign-modal-empty">Selecciona primero las fechas...</div>
              ) : availableLicenses.length === 0 ? (
                <div className="assign-modal-empty">No hay licencias disponibles para el período seleccionado</div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                    <input
                      type="search"
                      value={licenseFilter}
                      onChange={(e) => setLicenseFilter(e.target.value)}
                      placeholder="Filtrar por email o usuario Moodle..."
                      style={{ flex: '1 1 220px' }}
                    />
                    <button type="button" className="btn-secondary btn-small" onClick={selectAllFiltered}>
                      Seleccionar {licenseFilter ? 'filtradas' : 'todas'} ({filteredLicenses.length})
                    </button>
                    {selectedLicenseIds.length > 0 && (
                      <button type="button" className="btn-secondary btn-small" onClick={() => setSelectedLicenseIds([])}>
                        Quitar selección
                      </button>
                    )}
                  </div>
                  <div className="assign-license-list">
                    {filteredLicenses.map((license) => {
                      const selected = selectedLicenseIds.includes(license._id);
                      return (
                        <div
                          key={license._id}
                          className={`assign-license-card${selected ? ' selected' : ''}`}
                          role="checkbox"
                          aria-checked={selected}
                          tabIndex={0}
                          onClick={() => toggleLicense(license._id)}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              toggleLicense(license._id);
                            }
                          }}
                        >
                          <div className="assign-license-card-check">{selected ? '☑' : '☐'}</div>
                          <div>
                            <div className="assign-license-card-email">{license.email}</div>
                            <div className="assign-license-card-user">{license.usuarioMoodle}</div>
                          </div>
                        </div>
                      );
                    })}
                    {filteredLicenses.length === 0 && (
                      <div className="assign-modal-empty">Ninguna licencia coincide con el filtro</div>
                    )}
                  </div>
                  <small className="form-hint">
                    {availableLicenses.length} licencia(s) disponible(s) para el período seleccionado.{' '}
                    {startsWithin48h
                      ? 'Empieza en menos de 48 h: al crear se renovarán las contraseñas y se enviará ahora un único correo con todas las licencias.'
                      : 'Al crear se enviará ahora la reserva; las contraseñas se enviarán en un único correo unas 48 h antes del inicio.'}
                  </small>
                </>
              )}
            </div>

            {createError && <div className="error">{createError}</div>}

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={creating || selectedLicenseIds.length === 0}>
                {creating
                  ? 'Asignando...'
                  : selectedLicenseIds.length > 1
                    ? `Asignar ${selectedLicenseIds.length} licencias`
                    : 'Crear Asignación'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  resetCreateForm();
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pending Requests */}
      <div className="pending-requests">
        <h3>Solicitudes Pendientes ({pendingAssignments.length})</h3>
        {pendingAssignments.length === 0 ? (
          <div className="empty-state">
            <p>No hay solicitudes pendientes en este momento.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Área</th>
                  <th>Comunidad</th>
                  <th>Tipo de Uso</th>
                  <th>Fecha Inicio</th>
                  <th>Fecha Fin</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendingAssignments.map((assignment) => (
                  <tr key={assignment._id}>
                    <td>
                      {assignment.isExtension ? (
                        <span className="badge-extension">Ampliación</span>
                      ) : (
                        <span className="badge-nueva">Nueva</span>
                      )}
                    </td>
                    <td>{assignment.nombreApellidos}</td>
                    <td>{assignment.correocorporativo}</td>
                    <td>{assignment.area}</td>
                    <td>{assignment.comunidadAutonoma}</td>
                    <td>{displayTipoUso(assignment.tipoUso)}</td>
                    <td>{formatDate(assignment.fechaInicioUso)}</td>
                    <td>{formatDate(assignment.fechaFinUso)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="btn-primary btn-small"
                          onClick={() => handleStartAssigning(assignment)}
                        >
                          {assignment.isExtension ? 'Asignar Ampliación' : 'Asignar Licencia'}
                        </button>
                        <button
                          className="btn-danger btn-small"
                          onClick={() => handleCancelAssignment(assignment._id)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

      {/* Assign License Modal */}
      {assigningTo && (
        <div className="modal-overlay" onClick={handleCancelAssigning}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="assign-modal-header">
              <h3>
                <img src="/icons/calendar.png" className="icon-inline" alt="" />
                {assigningTo.isExtension ? ' Asignar Licencia para Ampliación' : ' Asignar Licencia'}
              </h3>
              <button className="close-button" onClick={handleCancelAssigning}>×</button>
            </div>

            <div className="assign-modal-info">
              <div className="assign-modal-info-row">
                <span className="assign-modal-label">Usuario</span>
                <span>{assigningTo.nombreApellidos}</span>
              </div>
              <div className="assign-modal-info-row">
                <span className="assign-modal-label">Email</span>
                <span>{assigningTo.correocorporativo}</span>
              </div>
              <div className="assign-modal-info-row">
                <span className="assign-modal-label">Tipo de Uso</span>
                <span>{displayTipoUso(assigningTo.tipoUso)}</span>
              </div>
              <div className="assign-modal-info-row">
                <span className="assign-modal-label">Período</span>
                <span>
                  {formatDate(assigningTo.fechaInicioUso)} →{' '}
                  {formatDate(assigningTo.fechaFinUso)}
                </span>
              </div>
            </div>

            {modalLoading ? (
              <div className="assign-modal-empty">Cargando licencia...</div>
            ) : extensionOriginalLicense && !forcePickLicense ? (
              /* Extension: show the original license, no picker needed */
              <div>
                <p className="assign-modal-subtitle">
                  Esta ampliación continuará con la misma licencia del período anterior:
                </p>
                <div className="assign-license-card selected" style={{ cursor: 'default' }}>
                  <div className="assign-license-card-check">●</div>
                  <div>
                    <div className="assign-license-card-email">{extensionOriginalLicense.email}</div>
                    {extensionOriginalLicense.usuarioMoodle && (
                      <div className="assign-license-card-user">{extensionOriginalLicense.usuarioMoodle}</div>
                    )}
                  </div>
                </div>
                <button
                  className="btn-link"
                  style={{ marginTop: '8px', fontSize: '0.85rem' }}
                  onClick={async () => {
                    setForcePickLicense(true);
                    setExtensionOriginalLicense(null);
                    setSelectedLicenseForAssignment('');
                    setModalLoading(true);
                    await loadAvailableLicensesForAssignment(assigningTo!);
                    setModalLoading(false);
                  }}
                >
                  Cambiar licencia
                </button>
              </div>
            ) : (
              /* Regular new assignment or admin forcing a different license */
              <div>
                <p className="assign-modal-subtitle">Selecciona una licencia disponible:</p>
                {availableLicenses.length === 0 ? (
                  <div className="assign-modal-empty">
                    <img src="/icons/shield.png" className="icon-inline" alt="" /> No hay licencias disponibles para este período.
                  </div>
                ) : (
                  <div className="assign-license-list">
                    {availableLicenses.map((license) => (
                      <div
                        key={license._id}
                        className={`assign-license-card${
                          selectedLicenseForAssignment === license._id ? ' selected' : ''
                        }`}
                        onClick={() => { setSelectedLicenseForAssignment(license._id); setAssignModalError(null); }}
                      >
                        <div className="assign-license-card-check">
                          {selectedLicenseForAssignment === license._id ? '●' : '○'}
                        </div>
                        <div>
                          <div className="assign-license-card-email">{license.email}</div>
                          <div className="assign-license-card-user">{license.usuarioMoodle}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {assignModalError && (
              <div className="error" style={{ margin: '0 0 8px' }}>{assignModalError}</div>
            )}
            <div className="assign-modal-footer">
              <button className="btn-secondary" onClick={handleCancelAssigning}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleAssignLicense}
                disabled={!selectedLicenseForAssignment || assigning}
              >
                {assigning ? 'Asignando...' : assigningTo.isExtension ? 'Confirmar Ampliación' : 'Confirmar Asignación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
