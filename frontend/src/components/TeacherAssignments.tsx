import { useState, useEffect } from 'react';
import { assignmentApi } from '../services/api.service';
import { Assignment, displayTipoUso } from '../types/license.types';
import { formatDate } from '../utils/date';

interface TeacherAssignmentsProps {
  teacherEmail?: string;
  refreshTrigger?: number;
}

export default function TeacherAssignments({ teacherEmail, refreshTrigger }: TeacherAssignmentsProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterEmail, setFilterEmail] = useState(teacherEmail || '');
  const [searchEmail, setSearchEmail] = useState(teacherEmail || '');

  const handleSearch = () => {
    setSearchEmail(filterEmail);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  // Sync email when navigating here after a successful form submission
  useEffect(() => {
    if (teacherEmail) {
      setFilterEmail(teacherEmail);
      setSearchEmail(teacherEmail);
    }
  }, [teacherEmail]);

  const loadAssignments = async () => {
    // Don't load if no email is provided
    if (!searchEmail.trim()) {
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
        (a) => a.correocorporativo.toLowerCase() === searchEmail.toLowerCase().trim()
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
  }, [searchEmail, refreshTrigger]);

  const getStatusInfo = (assignment: Assignment) => {
    const now = new Date();
    const startDate = new Date(assignment.fechaInicioUso);
    const endDate = new Date(assignment.fechaFinUso);

    if (assignment.estado === 'pendiente') {
      return { label: 'Pendiente de Aprobación', className: 'pending', icon: '○' };
    }
    if (assignment.estado === 'cancelado') {
      return { label: 'Cancelada', className: 'cancelled', icon: '×' };
    }
    if (assignment.estado === 'expirado' || endDate < now) {
      return { label: 'Expirada', className: 'expired', icon: '○' };
    }
    if (startDate > now) {
      return { label: 'Próxima', className: 'upcoming', icon: '→' };
    }
    return { label: 'Activa', className: 'active', icon: '●' };
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
      <div className="card">
        <h2><img src="/icons/calendar.png" className="icon-inline" alt="" /> Mis Asignaciones</h2>
        <p className="form-description">
          Ingresa tu email corporativo para consultar tus asignaciones de licencias Zoom.
        </p>

        {!teacherEmail && (
          <div className="form-section">
            <h3>Buscar Asignaciones</h3>
            <div className="form-row" style={{ alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="emailFilter">Email Corporativo *</label>
                <input
                  id="emailFilter"
                  type="email"
                  value={filterEmail}
                  onChange={(e) => setFilterEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="ejemplo@awakelab.cl"
                  autoFocus
                />
              </div>
              <div className="form-group" style={{ flex: '0 0 auto' }}>
                <button type="button" onClick={handleSearch} className="btn-secondary">
                  Buscar
                </button>
              </div>
            </div>
          </div>
        )}

        {!searchEmail.trim() ? (
          <div className="form-section">
            <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: '2rem 0' }}>
              Ingresa tu email corporativo para ver tus asignaciones.
            </p>
          </div>
        ) : (
          <>
            {/* Active & Upcoming Assignments */}
            <div className="form-section">
              <h3><img src="/icons/clipboard.png" className="icon-inline" alt="" /> Asignaciones Actuales y Próximas ({activeAssignments.length})</h3>
              {activeAssignments.length === 0 ? (
                <p style={{ color: 'var(--gray-500)', padding: '1rem 0' }}>
                  No tienes asignaciones activas o próximas.
                </p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Estado</th>
                        <th>Nombre</th>
                        <th>Área</th>
                        <th>Tipo de Uso</th>
                        <th>Fecha Inicio</th>
                        <th>Fecha Fin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeAssignments.map((assignment) => {
                        const status = getStatusInfo(assignment);
                        const daysRemaining = getDaysRemaining(assignment.fechaFinUso);
                        return (
                          <tr key={assignment._id}>
                            <td>
                              <span className={`badge ${status.className}`}>
                                {status.icon} {status.label}
                              </span>
                              {status.className === 'active' && daysRemaining <= 7 && (
                                <span className="badge" style={{ marginLeft: '0.5rem', background: 'var(--warning-light)', color: '#92400e' }}>
                                  {daysRemaining}d
                                </span>
                              )}
                            </td>
                            <td>{assignment.nombreApellidos}</td>
                            <td>{assignment.area}</td>
                            <td>{displayTipoUso(assignment.tipoUso)}</td>
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

            {/* Past Assignments */}
            {pastAssignments.length > 0 && (
              <div className="form-section">
                <h3><img src="/icons/clock.png" className="icon-inline" alt="" /> Asignaciones Pasadas ({pastAssignments.length})</h3>
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
                            <td>{formatDate(assignment.fechaInicioUso)}</td>
                            <td>{formatDate(assignment.fechaFinUso)}</td>
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
    </div>
  );
}
