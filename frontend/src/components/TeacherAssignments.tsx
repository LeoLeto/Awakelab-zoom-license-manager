import { useState, useEffect } from 'react';
import { assignmentApi } from '../services/api.service';
import { Assignment } from '../types/license.types';

interface TeacherAssignmentsProps {
  teacherEmail?: string;
  refreshTrigger?: number;
}

export default function TeacherAssignments({ teacherEmail, refreshTrigger }: TeacherAssignmentsProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterEmail, setFilterEmail] = useState(teacherEmail || '');

  const loadAssignments = async () => {
    // Don't load if no email is provided
    if (!filterEmail.trim()) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await assignmentApi.getAllAssignments();
      
      // Filter assignments by email - only show matching assignments
      const filteredAssignments = response.assignments.filter(
        (a) => a.correocorporativo.toLowerCase() === filterEmail.toLowerCase().trim()
      );
      
      // Sort by start date, most recent first
      filteredAssignments.sort(
        (a, b) => new Date(b.fechaInicioUso).getTime() - new Date(a.fechaInicioUso).getTime()
      );
      
      setAssignments(filteredAssignments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar asignaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, [filterEmail, refreshTrigger]);

  const getStatusInfo = (assignment: Assignment) => {
    const now = new Date();
    const startDate = new Date(assignment.fechaInicioUso);
    const endDate = new Date(assignment.fechaFinUso);

    if (assignment.estado === 'pendiente') {
      return { label: 'Pendiente de Aprobación', className: 'pending', icon: '⏳' };
    }
    if (assignment.estado === 'cancelado') {
      return { label: 'Cancelada', className: 'cancelled', icon: '🚫' };
    }
    if (assignment.estado === 'expirado' || endDate < now) {
      return { label: 'Expirada', className: 'expired', icon: '⌛' };
    }
    if (startDate > now) {
      return { label: 'Próxima', className: 'upcoming', icon: '📅' };
    }
    return { label: 'Activa', className: 'active', icon: '✅' };
  };

  const getDaysRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return <div className="loading">Cargando tus asignaciones...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={loadAssignments}>Reintentar</button>
      </div>
    );
  }

  const activeAssignments = assignments.filter((a) => {
    const status = getStatusInfo(a);
    return status.className === 'active' || status.className === 'upcoming' || status.className === 'pending';
  });

  const pastAssignments = assignments.filter((a) => {
    const status = getStatusInfo(a);
    return status.className === 'expired' || status.className === 'cancelled';
  });

  return (
    <div className="teacher-assignments">
      {!teacherEmail && (
        <div className="form-group email-filter-required">
          <label htmlFor="emailFilter">
            <strong>🔍 Ingresa tu Email Corporativo</strong>
          </label>
          <input
            id="emailFilter"
            type="email"
            value={filterEmail}
            onChange={(e) => setFilterEmail(e.target.value)}
            placeholder="ejemplo@awakelab.cl"
            autoFocus
          />
          <small>Ingresa tu email para ver tus asignaciones de licencias Zoom</small>
        </div>
      )}

      {!filterEmail.trim() ? (
        <div className="info-message">
          <p>👆 Por favor ingresa tu email corporativo arriba para ver tus asignaciones</p>
        </div>
      ) : (
        <>
          {/* Active & Upcoming Assignments */}
          <div className="assignments-section">
            <h3>📋 Asignaciones Actuales y Próximas ({activeAssignments.length})</h3>
            {activeAssignments.length === 0 ? (
              <div className="empty-state">
                <p>No tienes asignaciones activas o próximas.</p>
              </div>
            ) : (
          <div className="assignments-grid">
            {activeAssignments.map((assignment) => {
              const status = getStatusInfo(assignment);
              const daysRemaining = getDaysRemaining(assignment.fechaFinUso);

              return (
                <div key={assignment._id} className={`assignment-card ${status.className}`}>
                  <div className="card-header">
                    <span className={`status-badge ${status.className}`}>
                      {status.icon} {status.label}
                    </span>
                    {status.className === 'active' && daysRemaining <= 7 && (
                      <span className="warning-badge">⚠️ {daysRemaining} días restantes</span>
                    )}
                  </div>
                  
                  <div className="card-body">
                    <h4>{assignment.nombreApellidos}</h4>
                    <div className="assignment-details">
                      {assignment.licenseId && typeof assignment.licenseId === 'object' && (
                        <div className="detail-row">
                          <span className="label">🔑 Licencia Zoom:</span>
                          <span className="value">{(assignment.licenseId as any).email}</span>
                        </div>
                      )}
                      <div className="detail-row">
                        <span className="label">📧 Email:</span>
                        <span className="value">{assignment.correocorporativo}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">📚 Área:</span>
                        <span className="value">{assignment.area}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">📍 Comunidad:</span>
                        <span className="value">{assignment.comunidadAutonoma}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">💻 Plataforma:</span>
                        <span className="value">{assignment.tipoUso}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">📅 Período:</span>
                        <span className="value">
                          {new Date(assignment.fechaInicioUso).toLocaleDateString()} - 
                          {new Date(assignment.fechaFinUso).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Assignments */}
      {pastAssignments.length > 0 && (
        <div className="assignments-section">
          <h3>📜 Asignaciones Pasadas ({pastAssignments.length})</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Nombre</th>
                  <th>Área</th>
                  <th>Fecha Inicio</th>
                  <th>Fecha Fin</th>
                </tr>
              </thead>
              <tbody>
                {pastAssignments.map((assignment) => {
                  const status = getStatusInfo(assignment);
                  return (
                    <tr key={assignment._id}>
                      <td>
                        <span className={`badge ${status.className}`}>
                          {status.icon} {status.label}
                        </span>
                      </td>
                      <td>{assignment.nombreApellidos}</td>
                      <td>{assignment.area}</td>
                      <td>{new Date(assignment.fechaInicioUso).toLocaleDateString()}</td>
                      <td>{new Date(assignment.fechaFinUso).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
