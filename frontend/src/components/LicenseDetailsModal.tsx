import { Assignment, LicenseWithAssignment } from '../types/license.types';
import { useEffect, useState } from 'react';
import { HistoryViewer } from './HistoryViewer';
import { formatDate } from '../utils/date';
import { licenseApi } from '../services/api.service';
import { CancelAssignmentPanel, EditAssignmentPanel } from './AssignmentActionPanels';

export type LicenseDetailsTab = 'details' | 'schedule' | 'history';

interface LicenseDetailsModalProps {
  licenseData: LicenseWithAssignment;
  onClose: () => void;
  initialTab?: LicenseDetailsTab;
  /** An assignment was edited or cancelled: the caller should reload */
  onChanged?: () => void;
}

export default function LicenseDetailsModal({ licenseData, onClose, initialTab = 'details', onChanged }: LicenseDetailsModalProps) {
  const { license, assignment } = licenseData;
  const [activeTab, setActiveTab] = useState<LicenseDetailsTab>(initialTab);

  // Current and future bookings of this license (loaded up front so the tab shows a count)
  const [schedule, setSchedule] = useState<{ assignments: Assignment[]; pendingExtensions: Assignment[] } | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [action, setAction] = useState<{ kind: 'edit' | 'cancel'; assignment: Assignment } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleActionDone = (message: string) => {
    setAction(null);
    setNotice(message);
    setReloadKey((k) => k + 1);
    onChanged?.();
  };

  useEffect(() => {
    let cancelled = false;
    setSchedule(null);
    setScheduleError(null);
    licenseApi
      .getLicenseSchedule(license._id)
      .then((res) => {
        if (!cancelled) setSchedule({ assignments: res.assignments, pendingExtensions: res.pendingExtensions });
      })
      .catch((err) => {
        if (!cancelled) setScheduleError(err instanceof Error ? err.message : 'Error al cargar asignaciones');
      });
    return () => {
      cancelled = true;
    };
  }, [license._id, reloadKey]);

  const now = new Date();
  const periodStatus = (a: Assignment) =>
    new Date(a.fechaInicioUso) > now
      ? { label: 'Próxima', className: 'upcoming' }
      : { label: 'En curso', className: 'active' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content license-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><img src="/icons/clipboard.png" className="icon-inline" alt="" /> Detalles de la Licencia</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="modal-tabs">
          <button 
            className={activeTab === 'details' ? 'tab-active' : ''} 
            onClick={() => setActiveTab('details')}
          >
            Detalles
          </button>
          <button
            className={activeTab === 'schedule' ? 'tab-active' : ''}
            onClick={() => setActiveTab('schedule')}
          >
            Asignaciones{schedule ? ` (${schedule.assignments.length})` : ''}
          </button>
          <button 
            className={activeTab === 'history' ? 'tab-active' : ''} 
            onClick={() => setActiveTab('history')}
          >
            Historial
          </button>
        </div>
        
        <div className="modal-body">{activeTab === 'details' ? (
          <>
          <div className="details-section">
            <h4>Información de la Licencia</h4>
            <div className="details-grid">
              <div className="detail-item">
                <label>Email:</label>
                <span>{license.email}</span>
              </div>
              
              <div className="detail-item">
                <label>Usuario Moodle:</label>
                <span>{license.usuarioMoodle}</span>
              </div>
              
              <div className="detail-item">
                <label>Clave Usuario Moodle:</label>
                <span>{license.claveUsuarioMoodle}</span>
              </div>
              
              <div className="detail-item">
                <label>Clave Anfitrión Zoom:</label>
                <span>{license.claveAnfitrionZoom}</span>
              </div>
              
              <div className="detail-item">
                <label>Contraseña Zoom:</label>
                <span>{license.passwordZoom}</span>
              </div>
              
              <div className="detail-item">
                <label>Contraseña Email:</label>
                <span>{license.passwordEmail}</span>
              </div>
              
              <div className="detail-item">
                <label>Estado:</label>
                <span className={`badge ${license.estado}`}>
                  {license.estado}
                </span>
              </div>
              
              {license.observaciones && (
                <div className="detail-item full-width">
                  <label>Observaciones:</label>
                  <span>{license.observaciones}</span>
                </div>
              )}
              
              <div className="detail-item">
                <label>Cuenta:</label>
                <span>{license.cuenta}</span>
              </div>
            </div>
          </div>

          {assignment && (
            <div className="details-section">
              <h4>Información de Asignación</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <label>Nombre y Apellidos:</label>
                  <span>{assignment.nombreApellidos}</span>
                </div>
                
                <div className="detail-item">
                  <label>Correo Corporativo:</label>
                  <span>{assignment.correocorporativo}</span>
                </div>
                
                <div className="detail-item">
                  <label>Área:</label>
                  <span>{assignment.area}</span>
                </div>
                
                <div className="detail-item">
                  <label>Comunidad Autónoma:</label>
                  <span>{assignment.comunidadAutonoma}</span>
                </div>
                
                <div className="detail-item">
                  <label>Tipo de Uso (Plataforma):</label>
                  <span>{assignment.tipoUso}</span>
                </div>
                
                <div className="detail-item">
                  <label>Fecha Inicio Uso:</label>
                  <span>{formatDate(assignment.fechaInicioUso)}</span>
                </div>
                
                <div className="detail-item">
                  <label>Fecha Fin Uso:</label>
                  <span>{formatDate(assignment.fechaFinUso)}</span>
                </div>
                
                <div className="detail-item">
                  <label>Estado de Asignación:</label>
                  <span className={`badge ${assignment.estado}`}>
                    {assignment.estado}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="details-section">
            <h4>Información de Sistema</h4>
            <div className="details-grid">
              <div className="detail-item">
                <label>Fecha de Creación:</label>
                <span>{new Date(license.createdAt).toLocaleString()}</span>
              </div>
              
              <div className="detail-item">
                <label>Última Actualización:</label>
                <span>{new Date(license.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
          </>
          ) : activeTab === 'schedule' ? (
            <div className="details-section">
              <h4>Asignaciones actuales y futuras</h4>
              {notice && !action && <div className="schedule-notice">{notice}</div>}
              {action?.kind === 'edit' && (
                <EditAssignmentPanel
                  assignment={action.assignment}
                  licenseEmail={license.email}
                  onDone={handleActionDone}
                  onCancel={() => setAction(null)}
                />
              )}
              {action?.kind === 'cancel' && (
                <CancelAssignmentPanel
                  assignment={action.assignment}
                  licenseEmail={license.email}
                  onDone={handleActionDone}
                  onCancel={() => setAction(null)}
                />
              )}
              {scheduleError && <div className="error">{scheduleError}</div>}
              {!schedule && !scheduleError && <div className="loading">Cargando asignaciones...</div>}
              {schedule && schedule.assignments.length === 0 && (
                <p className="text-muted">Esta licencia no tiene asignaciones en curso ni reservas futuras.</p>
              )}
              {!action && schedule && schedule.assignments.length > 0 && (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Estado</th>
                        <th>Asignado a</th>
                        <th>Área</th>
                        <th>Desde</th>
                        <th>Hasta</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.assignments.map((a) => {
                        const status = periodStatus(a);
                        return (
                          <tr key={a._id}>
                            <td>
                              <span className={`badge ${status.className}`}>{status.label}</span>
                              {a.isExtension && <small className="text-muted"> ampliación</small>}
                            </td>
                            <td>
                              <strong>{a.nombreApellidos}</strong>
                              <br />
                              <small>{a.correocorporativo}</small>
                            </td>
                            <td>{a.area}</td>
                            <td>{formatDate(a.fechaInicioUso)}</td>
                            <td>{formatDate(a.fechaFinUso)}</td>
                            <td className="schedule-actions">
                              <button
                                className="btn-small"
                                onClick={() => { setNotice(null); setAction({ kind: 'edit', assignment: a }); }}
                              >
                                Editar
                              </button>
                              <button
                                className="btn-small btn-danger-outline"
                                onClick={() => { setNotice(null); setAction({ kind: 'cancel', assignment: a }); }}
                              >
                                Cancelar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {!action && schedule && schedule.pendingExtensions.length > 0 && (
                <>
                  <h4 style={{ marginTop: '1.5rem' }}>Solicitudes de ampliación pendientes</h4>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Solicitante</th>
                          <th>Desde</th>
                          <th>Hasta</th>
                          <th>Solicitada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedule.pendingExtensions.map((a) => (
                          <tr key={a._id}>
                            <td>
                              <strong>{a.nombreApellidos}</strong>
                              <br />
                              <small>{a.correocorporativo}</small>
                            </td>
                            <td>{formatDate(a.fechaInicioUso)}</td>
                            <td>{formatDate(a.fechaFinUso)}</td>
                            <td>{formatDate(a.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="history-section">
              <HistoryViewer 
                entityType="license" 
                entityId={license._id} 
                showFilters={false}
                title="Historial de esta Licencia"
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Cerrar
          </button>
        </div>

        <style>{`
          .modal-tabs {
            display: flex;
            gap: 10px;
            padding: 10px 20px;
            background: #f8f9fa;
            border-bottom: 2px solid #dee2e6;
          }

          .modal-tabs button {
            padding: 10px 20px;
            border: none;
            background: transparent;
            color: #6c757d;
            font-weight: 500;
            cursor: pointer;
            border-radius: 4px 4px 0 0;
            transition: all 0.3s;
          }

          .modal-tabs button:hover {
            background: #e9ecef;
            color: #495057;
          }

          .modal-tabs button.tab-active {
            background: white;
            color: #007bff;
            border-bottom: 3px solid #007bff;
          }

          .modal-content.license-details-modal { max-width: 960px; width: 95%; }
          .schedule-actions { white-space: nowrap; }
          .schedule-actions .btn-small + .btn-small { margin-left: 6px; }
          .btn-danger-outline { color: #b91c1c; border-color: #fca5a5; }
          .schedule-notice {
            background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46;
            padding: 10px 14px; border-radius: 6px; margin-bottom: 12px;
          }
          .assignment-action-panel {
            border: 1px solid #dee2e6; border-radius: 8px; padding: 16px; margin-bottom: 12px;
          }
          .assignment-action-panel.danger { border-color: #fca5a5; background: #fef2f2; }
          .assignment-action-panel h4 { margin-top: 0; }
          .assignment-action-panel ul { margin: 8px 0; padding-left: 20px; }
          .assignment-action-panel .form-row { display: flex; gap: 12px; flex-wrap: wrap; }
          .assignment-action-panel .form-group { flex: 1 1 220px; display: flex; flex-direction: column; margin-bottom: 10px; }
          .assignment-action-panel .form-group label { font-weight: 500; margin-bottom: 4px; }
          .assignment-action-panel input, .assignment-action-panel select { padding: 6px 8px; }
          .panel-note { font-size: 13px; color: #555; margin: 8px 0; }
          .panel-note.warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px 12px; color: #333; }
          .panel-check { display: flex; gap: 8px; align-items: flex-start; margin: 10px 0; font-size: 14px; }
          .panel-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
          .btn-danger {
            background: #dc2626; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;
          }
          .btn-danger:disabled { opacity: 0.6; cursor: default; }

          .history-section {
            max-height: 500px;
            overflow-y: auto;
            padding: 10px;
          }
        `}</style>
      </div>
    </div>
  );
}
