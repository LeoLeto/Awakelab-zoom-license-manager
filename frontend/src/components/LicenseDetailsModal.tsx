import { Assignment, LicenseWithAssignment } from '../types/license.types';
import { useEffect, useState } from 'react';
import { HistoryViewer } from './HistoryViewer';
import { formatDate } from '../utils/date';
import { licenseApi } from '../services/api.service';

export type LicenseDetailsTab = 'details' | 'schedule' | 'history';

interface LicenseDetailsModalProps {
  licenseData: LicenseWithAssignment;
  onClose: () => void;
  initialTab?: LicenseDetailsTab;
}

export default function LicenseDetailsModal({ licenseData, onClose, initialTab = 'details' }: LicenseDetailsModalProps) {
  const { license, assignment } = licenseData;
  const [activeTab, setActiveTab] = useState<LicenseDetailsTab>(initialTab);

  // Current and future bookings of this license (loaded up front so the tab shows a count)
  const [schedule, setSchedule] = useState<{ assignments: Assignment[]; pendingExtensions: Assignment[] } | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

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
  }, [license._id]);

  const now = new Date();
  const periodStatus = (a: Assignment) =>
    new Date(a.fechaInicioUso) > now
      ? { label: 'Próxima', className: 'upcoming' }
      : { label: 'En curso', className: 'active' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
              {scheduleError && <div className="error">{scheduleError}</div>}
              {!schedule && !scheduleError && <div className="loading">Cargando asignaciones...</div>}
              {schedule && schedule.assignments.length === 0 && (
                <p className="text-muted">Esta licencia no tiene asignaciones en curso ni reservas futuras.</p>
              )}
              {schedule && schedule.assignments.length > 0 && (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Estado</th>
                        <th>Asignado a</th>
                        <th>Área</th>
                        <th>Desde</th>
                        <th>Hasta</th>
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
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {schedule && schedule.pendingExtensions.length > 0 && (
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
