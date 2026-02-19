import { useState, useEffect } from 'react';
import { assignmentApi, licenseApi } from '../services/api.service';
import { Assignment, License } from '../types/license.types';
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
  const [formData, setFormData] = useState({
    licenseId: '',
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
    } catch (err) {
      console.error('Failed to load available licenses:', err);
      setAvailableLicenses([]);
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
  }, []);

  useEffect(() => {
    if (showCreateForm) {
      loadAvailableLicenses();
    }
  }, [formData.fechaInicioUso, formData.fechaFinUso, showCreateForm]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await assignmentApi.createAssignment(formData);
      setShowCreateForm(false);
      setFormData({
        licenseId: '',
        nombreApellidos: '',
        correocorporativo: '',
        area: '',
        comunidadAutonoma: '',
        tipoUso: '',
        fechaInicioUso: '',
        fechaFinUso: '',
      });
      loadPendingAssignments();
      onAssignmentChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear asignación');
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
    setModalLoading(true);
    await loadAvailableLicensesForAssignment(assignment);
    setModalLoading(false);
  };

  const handleAssignLicense = async () => {
    if (!assigningTo || !selectedLicenseForAssignment) return;

    try {
      await assignmentApi.updateAssignment(assigningTo._id, {
        licenseId: selectedLicenseForAssignment
      });
      setAssigningTo(null);
      setSelectedLicenseForAssignment('');
      setAvailableLicenses([]);
      loadPendingAssignments();
      onAssignmentChange?.();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar licencia');
    }
  };

  const handleCancelAssigning = () => {
    setAssigningTo(null);
    setSelectedLicenseForAssignment('');
    setAvailableLicenses([]);
  };

  if (loading) {
    return <div className="loading">Cargando solicitudes...</div>;
  }

  return (
    <>
    <div className="assignment-manager">
      <div className="section-header">
        <h2>📋 Solicitudes y Nuevas Asignaciones</h2>
        <button
          className="btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? '✖ Cancelar' : '➕ Nueva Asignación'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

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
                <input
                  type="text"
                  required
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  placeholder="Matemáticas"
                />
              </div>
              <div className="form-group">
                <label>Comunidad Autónoma *</label>
                <input
                  type="text"
                  required
                  value={formData.comunidadAutonoma}
                  onChange={(e) => setFormData({ ...formData, comunidadAutonoma: e.target.value })}
                  placeholder="Madrid"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Tipo de Plataforma *</label>
                <select
                  required
                  value={formData.tipoUso}
                  onChange={(e) => setFormData({ ...formData, tipoUso: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Zoom Meetings">Zoom Meetings</option>
                  <option value="Zoom Webinar">Zoom Webinar</option>
                  <option value="Both">Ambos</option>
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
              <label>Licencia Disponible *</label>
              <select
                required
                value={formData.licenseId}
                onChange={(e) => setFormData({ ...formData, licenseId: e.target.value })}
                disabled={!formData.fechaInicioUso || !formData.fechaFinUso}
              >
                <option value="">
                  {!formData.fechaInicioUso || !formData.fechaFinUso
                    ? 'Selecciona primero las fechas...'
                    : availableLicenses.length === 0
                    ? 'No hay licencias disponibles para el período seleccionado'
                    : 'Selecciona una licencia...'}
                </option>
                {availableLicenses.map((license) => (
                  <option key={license._id} value={license._id}>
                    {license.email} - {license.usuarioMoodle}
                  </option>
                ))}
              </select>
              {availableLicenses.length > 0 && (
                <small className="form-hint">
                  {availableLicenses.length} licencia(s) disponible(s) para el período seleccionado
                </small>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Crear Asignación
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowCreateForm(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pending Requests */}
      <div className="pending-requests">
        <h3>⏳ Solicitudes Pendientes ({pendingAssignments.length})</h3>
        {pendingAssignments.length === 0 ? (
          <div className="empty-state">
            <p>✅ No hay solicitudes pendientes en este momento.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Área</th>
                  <th>Comunidad</th>
                  <th>Plataforma</th>
                  <th>Fecha Inicio</th>
                  <th>Fecha Fin</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendingAssignments.map((assignment) => (
                  <tr key={assignment._id}>
                    <td>{assignment.nombreApellidos}</td>
                    <td>{assignment.correocorporativo}</td>
                    <td>{assignment.area}</td>
                    <td>{assignment.comunidadAutonoma}</td>
                    <td>{assignment.tipoUso}</td>
                    <td>{formatDate(assignment.fechaInicioUso)}</td>
                    <td>{formatDate(assignment.fechaFinUso)}</td>
                    <td>
                      <button
                        className="btn-primary btn-small"
                        onClick={() => handleStartAssigning(assignment)}
                      >
                        Asignar Licencia
                      </button>
                      <button
                        className="btn-danger btn-small"
                        onClick={() => handleCancelAssignment(assignment._id)}
                      >
                        Cancelar
                      </button>
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
              <h3>🎫 Asignar Licencia</h3>
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
                <span className="assign-modal-label">Plataforma</span>
                <span>{assigningTo.tipoUso}</span>
              </div>
              <div className="assign-modal-info-row">
                <span className="assign-modal-label">Período</span>
                <span>
                  {formatDate(assigningTo.fechaInicioUso)} →{' '}
                  {formatDate(assigningTo.fechaFinUso)}
                </span>
              </div>
            </div>

            <p className="assign-modal-subtitle">Selecciona una licencia disponible:</p>

            {modalLoading ? (
              <div className="assign-modal-empty">Cargando licencias...</div>
            ) : availableLicenses.length === 0 ? (
              <div className="assign-modal-empty">⚠️ No hay licencias disponibles para este período.</div>
            ) : (
              <div className="assign-license-list">
                {availableLicenses.map((license) => (
                  <div
                    key={license._id}
                    className={`assign-license-card${
                      selectedLicenseForAssignment === license._id ? ' selected' : ''
                    }`}
                    onClick={() => setSelectedLicenseForAssignment(license._id)}
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

            <div className="assign-modal-footer">
              <button className="btn-secondary" onClick={handleCancelAssigning}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleAssignLicense}
                disabled={!selectedLicenseForAssignment}
              >
                ✓ Confirmar Asignación
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
