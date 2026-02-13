import { useState, useEffect } from 'react';
import { assignmentApi } from '../services/api.service';
import { Assignment } from '../types/license.types';

interface TeacherAssignmentsProps {
  teacherEmail?: string;
  refreshTrigger?: number;
}

export default function TeacherAssignments({ teacherEmail, refreshTrigger }: TeacherAssignmentsProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterEmail, setFilterEmail] = useState(teacherEmail || '');

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await assignmentApi.getAllAssignments();
      
      // Filter assignments by email if provided
      let filteredAssignments = response.assignments;
      if (filterEmail) {
        filteredAssignments = filteredAssignments.filter(
          (a) => a.correocorporativo.toLowerCase() === filterEmail.toLowerCase()
        );
      }
      
      // Sort by start date, most recent first
      filteredAssignments.sort(
        (a, b) => new Date(b.fechaInicioUso).getTime() - new Date(a.fechaInicioUso).getTime()
      );
      
      setAssignments(filteredAssignments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
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

    if (assignment.estado === 'cancelado') {
      return { label: 'Cancelled', className: 'cancelled', icon: '🚫' };
    }
    if (assignment.estado === 'expirado' || endDate < now) {
      return { label: 'Expired', className: 'expired', icon: '⌛' };
    }
    if (startDate > now) {
      return { label: 'Upcoming', className: 'upcoming', icon: '📅' };
    }
    return { label: 'Active', className: 'active', icon: '✅' };
  };

  const getDaysRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return <div className="loading">Loading your assignments...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={loadAssignments}>Retry</button>
      </div>
    );
  }

  const activeAssignments = assignments.filter((a) => {
    const status = getStatusInfo(a);
    return status.className === 'active' || status.className === 'upcoming';
  });

  const pastAssignments = assignments.filter((a) => {
    const status = getStatusInfo(a);
    return status.className === 'expired' || status.className === 'cancelled';
  });

  return (
    <div className="teacher-assignments">
      {!teacherEmail && (
        <div className="form-group">
          <label htmlFor="emailFilter">Filter by Email</label>
          <input
            id="emailFilter"
            type="email"
            value={filterEmail}
            onChange={(e) => setFilterEmail(e.target.value)}
            placeholder="Enter your corporate email..."
          />
        </div>
      )}

      {/* Active & Upcoming Assignments */}
      <div className="assignments-section">
        <h3>📋 Current & Upcoming Assignments ({activeAssignments.length})</h3>
        {activeAssignments.length === 0 ? (
          <div className="empty-state">
            <p>You have no active or upcoming assignments.</p>
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
                      <span className="warning-badge">⚠️ {daysRemaining} days left</span>
                    )}
                  </div>
                  
                  <div className="card-body">
                    <h4>{assignment.nombreApellidos}</h4>
                    <div className="assignment-details">
                      <div className="detail-row">
                        <span className="label">📧 Email:</span>
                        <span className="value">{assignment.correocorporativo}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">📚 Area:</span>
                        <span className="value">{assignment.area}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">📍 Community:</span>
                        <span className="value">{assignment.comunidadAutonoma}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">💻 Platform:</span>
                        <span className="value">{assignment.tipoUso}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">📅 Period:</span>
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
          <h3>📜 Past Assignments ({pastAssignments.length})</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Name</th>
                  <th>Area</th>
                  <th>Start Date</th>
                  <th>End Date</th>
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
    </div>
  );
}
