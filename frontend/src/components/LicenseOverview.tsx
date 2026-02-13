import { useState, useEffect } from 'react';
import { licenseApi } from '../services/api.service';
import { LicenseWithAssignment } from '../types/license.types';
import PasswordChangeModal from './PasswordChangeModal';
import { ZoomUser } from '../types/zoom.types';

interface LicenseOverviewProps {
  refreshTrigger?: number;
}

export default function LicenseOverview({ refreshTrigger }: LicenseOverviewProps) {
  const [licenses, setLicenses] = useState<LicenseWithAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'libre' | 'ocupado' | 'mantenimiento'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<ZoomUser | null>(null);

  const loadLicenses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await licenseApi.getAllLicenses();
      setLicenses(response.licenses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load licenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLicenses();
  }, [refreshTrigger]);

  const filteredLicenses = licenses.filter((item) => {
    const matchesFilter = filter === 'all' || item.license.estado === filter;
    const matchesSearch = 
      item.license.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.license.usuarioMoodle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.license.cuenta.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: licenses.length,
    libre: licenses.filter((l) => l.license.estado === 'libre').length,
    ocupado: licenses.filter((l) => l.license.estado === 'ocupado').length,
    mantenimiento: licenses.filter((l) => l.license.estado === 'mantenimiento').length,
  };

  if (loading) {
    return <div className="loading">Loading licenses...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={loadLicenses}>Retry</button>
      </div>
    );
  }

  const handlePasswordChange = (license: LicenseWithAssignment) => {
    const zoomUser: ZoomUser = {
      id: license.license._id,
      email: license.license.email,
      first_name: license.license.usuarioMoodle,
      last_name: '',
      type: 2,
    };
    setSelectedUser(zoomUser);
  };

  return (
    <div className="license-overview">
      <div className="section-header">
        <h2>📊 License Overview</h2>
        <button onClick={loadLicenses} className="btn-refresh">🔄 Refresh</button>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Licenses</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card libre">
          <div className="stat-label">Available</div>
          <div className="stat-value">{stats.libre}</div>
        </div>
        <div className="stat-card ocupado">
          <div className="stat-label">Occupied</div>
          <div className="stat-value">{stats.ocupado}</div>
        </div>
        <div className="stat-card mantenimiento">
          <div className="stat-label">Maintenance</div>
          <div className="stat-value">{stats.mantenimiento}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All ({stats.total})
          </button>
          <button
            className={filter === 'libre' ? 'active' : ''}
            onClick={() => setFilter('libre')}
          >
            Available ({stats.libre})
          </button>
          <button
            className={filter === 'ocupado' ? 'active' : ''}
            onClick={() => setFilter('ocupado')}
          >
            Occupied ({stats.ocupado})
          </button>
          <button
            className={filter === 'mantenimiento' ? 'active' : ''}
            onClick={() => setFilter('mantenimiento')}
          >
            Maintenance ({stats.mantenimiento})
          </button>
        </div>
        <input
          type="text"
          placeholder="🔍 Search by email, username, or account..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* License Table */}
      <div className="table-container">
        <table className="licenses-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Email</th>
              <th>Moodle User</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th>Period</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLicenses.map((item) => (
              <tr key={item.license._id}>
                <td>{item.license.cuenta}</td>
                <td>{item.license.email}</td>
                <td>{item.license.usuarioMoodle}</td>
                <td>
                  <span className={`badge ${item.license.estado}`}>
                    {item.license.estado}
                  </span>
                </td>
                <td>
                  {item.assignment ? (
                    <div>
                      <strong>{item.assignment.nombreApellidos}</strong>
                      <br />
                      <small>{item.assignment.correocorporativo}</small>
                    </div>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>
                  {item.assignment ? (
                    <small>
                      {new Date(item.assignment.fechaInicioUso).toLocaleDateString()} -{' '}
                      {new Date(item.assignment.fechaFinUso).toLocaleDateString()}
                    </small>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>
                  <button
                    className="btn-small"
                    onClick={() => handlePasswordChange(item)}
                    title="Change Zoom password"
                  >
                    🔐
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredLicenses.length === 0 && (
        <div className="empty-state">
          <p>No licenses found matching your criteria.</p>
        </div>
      )}

      {selectedUser && (
        <PasswordChangeModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSuccess={() => {
            setSelectedUser(null);
            loadLicenses();
          }}
        />
      )}
    </div>
  );
}
