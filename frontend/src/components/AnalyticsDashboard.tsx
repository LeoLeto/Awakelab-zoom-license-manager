import React, { useState, useEffect } from 'react';
import apiService from '../services/api.service';

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

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [overviewData, teachersData] = await Promise.all([
        apiService.getAnalyticsOverview(),
        apiService.getAnalyticsTeachers(10)
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

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL');
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
        <h2>📊 Panel de Análisis</h2>
        <div className="analytics-actions">
          <button onClick={loadAnalytics} className="btn-refresh">
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="overview-grid">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <div className="stat-label">Total de Licencias</div>
              <div className="stat-value">{overview.totalLicenses}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-label">Licencias Asignadas</div>
              <div className="stat-value">{overview.assignedLicenses}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📊</div>
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
            <div className="stat-icon">⏰</div>
            <div className="stat-content">
              <div className="stat-label">Expiran Esta Semana</div>
              <div className="stat-value">{overview.expiringThisWeek}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-label">Profesores Activos</div>
              <div className="stat-value">{overview.totalTeachers}</div>
            </div>
          </div>

          <div className="stat-card clickable" onClick={() => overview.pendingRequests > 0 && setShowPendingModal(true)}>
            <div className="stat-icon">📋</div>
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
          <h3>👨‍🏫 Licencias por Profesor</h3>
          <div className="analytics-table">
            <table>
              <thead>
                <tr>
                  <th>Profesor</th>
                  <th>Email</th>
                  <th>Asignaciones Actuales</th>
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
                      <span className="badge badge-current">{teacher.currentAssignments}</span>
                    </td>
                    <td>
                      <span className="badge badge-count">{teacher.totalAssignments}</span>
                    </td>
                    <td>{formatDate(teacher.lastActivity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expiring Licenses Modal */}
      {showExpiringModal && (
        <div className="modal-overlay" onClick={() => setShowExpiringModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⏰ Licencias que Expiran Esta Semana</h3>
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
              <h3>📋 Solicitudes Pendientes</h3>
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
