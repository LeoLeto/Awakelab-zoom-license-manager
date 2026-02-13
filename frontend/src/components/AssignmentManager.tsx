import { useState, useEffect } from 'react';
import { assignmentApi, licenseApi } from '../services/api.service';
import { Assignment, License } from '../types/license.types';

interface AssignmentManagerProps {
  onAssignmentChange?: () => void;
}

export default function AssignmentManager({ onAssignmentChange }: AssignmentManagerProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [availableLicenses, setAvailableLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
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

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await assignmentApi.getActiveAssignments();
      setAssignments(response.assignments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
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

  useEffect(() => {
    loadAssignments();
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
      loadAssignments();
      onAssignmentChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment');
    }
  };

  const handleCancelAssignment = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this assignment?')) return;

    try {
      await assignmentApi.cancelAssignment(id);
      loadAssignments();
      onAssignmentChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel assignment');
    }
  };

  if (loading) {
    return <div className="loading">Loading assignments...</div>;
  }

  return (
    <div className="assignment-manager">
      <div className="section-header">
        <h2>📅 Assignment Management</h2>
        <button
          className="btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? '✖ Cancel' : '➕ New Assignment'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Create Assignment Form */}
      {showCreateForm && (
        <div className="card">
          <h3>Create New Assignment</h3>
          <form onSubmit={handleCreateAssignment} className="assignment-form">
            <div className="form-row">
              <div className="form-group">
                <label>Teacher Name *</label>
                <input
                  type="text"
                  required
                  value={formData.nombreApellidos}
                  onChange={(e) => setFormData({ ...formData, nombreApellidos: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="form-group">
                <label>Corporate Email *</label>
                <input
                  type="email"
                  required
                  value={formData.correocorporativo}
                  onChange={(e) => setFormData({ ...formData, correocorporativo: e.target.value })}
                  placeholder="john.doe@example.com"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Area/Department *</label>
                <input
                  type="text"
                  required
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  placeholder="Mathematics"
                />
              </div>
              <div className="form-group">
                <label>Autonomous Community *</label>
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
                <label>Platform Type *</label>
                <select
                  required
                  value={formData.tipoUso}
                  onChange={(e) => setFormData({ ...formData, tipoUso: e.target.value })}
                >
                  <option value="">Select...</option>
                  <option value="Zoom Meetings">Zoom Meetings</option>
                  <option value="Zoom Webinar">Zoom Webinar</option>
                  <option value="Both">Both</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  required
                  value={formData.fechaInicioUso}
                  onChange={(e) => setFormData({ ...formData, fechaInicioUso: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>End Date *</label>
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
              <label>Available License *</label>
              <select
                required
                value={formData.licenseId}
                onChange={(e) => setFormData({ ...formData, licenseId: e.target.value })}
                disabled={!formData.fechaInicioUso || !formData.fechaFinUso}
              >
                <option value="">
                  {!formData.fechaInicioUso || !formData.fechaFinUso
                    ? 'Select dates first...'
                    : availableLicenses.length === 0
                    ? 'No licenses available for selected period'
                    : 'Select a license...'}
                </option>
                {availableLicenses.map((license) => (
                  <option key={license._id} value={license._id}>
                    {license.email} - {license.usuarioMoodle}
                  </option>
                ))}
              </select>
              {availableLicenses.length > 0 && (
                <small className="form-hint">
                  {availableLicenses.length} license(s) available for selected period
                </small>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Create Assignment
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Assignments */}
      <div className="assignments-list">
        <h3>Active Assignments ({assignments.length})</h3>
        {assignments.length === 0 ? (
          <div className="empty-state">
            <p>No active assignments found.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Email</th>
                  <th>Area</th>
                  <th>Community</th>
                  <th>Platform</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment._id}>
                    <td>{assignment.nombreApellidos}</td>
                    <td>{assignment.correocorporativo}</td>
                    <td>{assignment.area}</td>
                    <td>{assignment.comunidadAutonoma}</td>
                    <td>{assignment.tipoUso}</td>
                    <td>{new Date(assignment.fechaInicioUso).toLocaleDateString()}</td>
                    <td>{new Date(assignment.fechaFinUso).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${assignment.estado}`}>
                        {assignment.estado}
                      </span>
                    </td>
                    <td>
                      {assignment.estado === 'activo' && (
                        <button
                          className="btn-danger btn-small"
                          onClick={() => handleCancelAssignment(assignment._id)}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
