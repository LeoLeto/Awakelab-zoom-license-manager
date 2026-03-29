import React, { useState, useEffect } from 'react';
import apiService, { assignmentApi } from '../services/api.service';
import { Assignment } from '../types/license.types';

interface OverviewStats {
  totalLicenses: number;
  assignedLicenses: number;
  availableLicenses: number;
  utilizationRate: number;
  expiringThisWeek: number;
  totalTeachers: number;
  pendingRequests: number;
}

interface TeacherMetric {
  teacherName: string;
  teacherEmail: string;
  currentAssignments: number;
  totalAssignments: number;
  lastActivity?: string;
}

const AnalyticsDashboard: React.FC = () => {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [teachers, setTeachers] = useState<TeacherMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExpiringModal, setShowExpiringModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);

  // Assignment detail modal
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherMetric | null>(null);
  const [assignmentFilter, setAssignmentFilter] = useState<'active' | 'all'>('all');
  const [teacherAssignments, setTeacherAssignments] = useState<Assignment[]>([]);
  const [assignmentModalLoading, setAssignmentModalLoading] = useState(false);
  const [assignmentModalError, setAssignmentModalError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [overviewData, teachersData] = await Promise.all([
        apiService.getAnalyticsOverview(),
        apiService.getAnalyticsTeachers(50)
      ]);

      setOverview(overviewData);
      setTeachers(teachersData);
    } catch (err) {
      console.error('Error al cargar analytics:', err);
      setError('Error al cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssignmentsModal = async (teacher: TeacherMetric, filter: 'active' | 'all') => {
    setSelectedTeacher(teacher);
    setAssignmentFilter(filter);
    setTeacherAssignments([]);
    setAssignmentModalError(null);
    setAssignmentModalLoading(true);
    try {
      const result = await assignmentApi.getAllAssignmentsByTeacher(teacher.teacherEmail);
      const assignments = filter === 'active'
        ? result.assignments.filter(a => a.estado === 'activo')
        : result.assignments;
      setTeacherAssignments(assignments);
    } catch (err) {
      setAssignmentModalError('Error al cargar las asignaciones');
    } finally {
      setAssignmentModalLoading(false);
    }
  };

  const handleCloseAssignmentsModal = () => {
    setSelectedTeacher(null);
    setTeacherAssignments([]);
    setAssignmentModalError(null);
  };

  const getEstadoBadgeClass = (estado: string): string => {
    switch (estado) {
      case 'activo': return 'badge-active';
      case 'expirado': return 'badge-expired';
      case 'cancelado': return 'badge-cancelled';
      case 'pendiente': return 'badge-pending';
      default: return '';
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  if (loading) {
    return (
      <div className="analytics-dashboard">
        <div className="loading">Cargando estadísticas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-dashboard">
        <div className="error-message">{error}</div>
        <button onClick={loadAnalytics} className="btn-primary">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h2><img src="/icons/chart.png" className="icon-inline" alt="" /> Panel de Análisis</h2>
        <div className="analytics-actions">
          <button onClick={loadAnalytics} className="btn-refresh">
            Actualizar
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="overview-grid">
          <div className="stat-card">
            <div className="stat-icon"><img src="/icons/monitor.png" className="icon-inline-lg" alt="" /></div>
            <div className="stat-content">
              <div className="stat-label">Total de Licencias</div>
              <div className="stat-value">{overview.totalLicenses}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><img src="/icons/shield.png" className="icon-inline-lg" alt="" /></div>
            <div className="stat-content">
              <div className="stat-label">Licencias Asignadas</div>
              <div className="stat-value">{overview.assignedLicenses}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><img src="/icons/chart.png" className="icon-inline-lg" alt="" /></div>
            <div className="stat-content">
              <div className="stat-label">Tasa de Utilización</div>
              <div className="stat-value">{overview.utilizationRate}%</div>
              <div className="stat-progress">
                <div 
                  className="stat-progress-bar" 
                  style={{ width: `${overview.utilizationRate}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="stat-card clickable" onClick={() => overview.expiringThisWeek > 0 && setShowExpiringModal(true)}>
            <div className="stat-icon"><img src="/icons/clock.png" className="icon-inline-lg" alt="" /></div>
            <div className="stat-content">
              <div className="stat-label">Expiran Esta Semana</div>
              <div className="stat-value">{overview.expiringThisWeek}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><img src="/icons/messages.png" className="icon-inline-lg" alt="" /></div>
            <div className="stat-content">
              <div className="stat-label">Usuarios Activos</div>
              <div className="stat-value">{overview.totalTeachers}</div>
            </div>
          </div>

          <div className="stat-card clickable" onClick={() => overview.pendingRequests > 0 && setShowPendingModal(true)}>
            <div className="stat-icon"><img src="/icons/clipboard.png" className="icon-inline-lg" alt="" /></div>
            <div className="stat-content">
              <div className="stat-label">Solicitudes Pendientes</div>
              <div className="stat-value">{overview.pendingRequests}</div>
            </div>
          </div>
        </div>
      )}

      {/* Top Teachers */}
      {teachers.length > 0 && (
        <div className="analytics-section">
          <h3><img src="/icons/messages.png" className="icon-inline" alt="" /> Licencias por Usuario</h3>
          <div className="analytics-table">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Asignaciones Activas</th>
                  <th>Total Asignaciones</th>
                  <th>Última Actividad</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher, index) => (
                  <tr key={index}>
                    <td className="teacher-name">{teacher.teacherName}</td>
                    <td className="teacher-email">{teacher.teacherEmail}</td>
                    <td>
                      <span
                        className="badge badge-current clickable-badge"
                        onClick={() => handleOpenAssignmentsModal(teacher, 'active')}
                        title="Ver asignaciones activas"
                      >
                        {teacher.currentAssignments}
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge badge-count clickable-badge"
                        onClick={() => handleOpenAssignmentsModal(teacher, 'all')}
                        title="Ver todas las asignaciones"
                      >
                        {teacher.totalAssignments}
                      </span>
                    </td>
                    <td>{formatDate(teacher.lastActivity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Teacher Assignments Modal */}
      {selectedTeacher && (
        <div className="modal-overlay" onClick={handleCloseAssignmentsModal}>
          <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>
                  {assignmentFilter === 'active' ? 'Asignaciones Activas' : 'Todas las Asignaciones'}
                </h3>
                <p className="modal-subtitle">{selectedTeacher.teacherName} — {selectedTeacher.teacherEmail}</p>
              </div>
              <button className="modal-close" onClick={handleCloseAssignmentsModal}>✕</button>
            </div>
            <div className="modal-body">
              {assignmentModalLoading ? (
                <div className="loading">Cargando asignaciones...</div>
              ) : assignmentModalError ? (
                <div className="error-message">{assignmentModalError}</div>
              ) : teacherAssignments.length === 0 ? (
                <p className="text-muted">No hay asignaciones {assignmentFilter === 'active' ? 'activas' : ''} para este usuario.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Estado</th>
                        <th>Área</th>
                        <th>Comunidad</th>
                        <th>Plataforma</th>
                        <th>Licencia Zoom</th>
                        <th>Fecha Inicio</th>
                        <th>Fecha Fin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherAssignments.map((assignment) => {
                        const license = assignment.licenseId && typeof assignment.licenseId === 'object'
                          ? assignment.licenseId as import('../types/license.types').License
                          : null;
                        return (
                        <tr key={assignment._id}>
                          <td>
                            <span className={`badge ${getEstadoBadgeClass(assignment.estado)}`}>
                              {assignment.estado}
                            </span>
                          </td>
                          <td>{assignment.area}</td>
                          <td>{assignment.comunidadAutonoma || '—'}</td>
                          <td>{assignment.tipoUso}</td>
                          <td>
                            {license ? (
                              <div className="license-cell">
                                <span className="license-email">{license.email}</span>
                                <span className="license-user">{license.usuarioMoodle}</span>
                                {license.cuenta && (
                                  <span className="license-account">Cuenta: {license.cuenta}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>{formatDate(assignment.fechaInicioUso)}</td>
                          <td>{formatDate(assignment.fechaFinUso)}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expiring Licenses Modal */}
      {showExpiringModal && (
        <div className="modal-overlay" onClick={() => setShowExpiringModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><img src="/icons/clock.png" className="icon-inline" alt="" /> Licencias que Expiran Esta Semana</h3>
              <button className="modal-close" onClick={() => setShowExpiringModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Para ver el detalle de las licencias que expiran, ve a la pestaña <strong>Licencias</strong> y filtra por estado "Activo" y fecha de expiración.</p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Requests Modal */}
      {showPendingModal && (
        <div className="modal-overlay" onClick={() => setShowPendingModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><img src="/icons/clipboard.png" className="icon-inline" alt="" /> Solicitudes Pendientes</h3>
              <button className="modal-close" onClick={() => setShowPendingModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Para gestionar las solicitudes pendientes, ve a la pestaña <strong>Solicitudes</strong> donde podrás aprobar o rechazar cada una.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
