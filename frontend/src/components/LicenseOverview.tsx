import { useState, useEffect } from 'react';
import { licenseApi } from '../services/api.service';
import { LicenseWithAssignment } from '../types/license.types';
import { formatDate } from '../utils/date';
import PasswordChangeModal from './PasswordChangeModal';
import LicenseDetailsModal from './LicenseDetailsModal';
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
  const [selectedLicenseForDetails, setSelectedLicenseForDetails] = useState<LicenseWithAssignment | null>(null);

  const loadLicenses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await licenseApi.getAllLicenses();
      // Filter out any invalid data
      const validLicenses = response.licenses.filter(
        (item: any) => item && item.license && item.license.email
      );
      setLicenses(validLicenses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar licencias');
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
      item.license.usuarioMoodle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: licenses.length,
    libre: licenses.filter((l) => l.license.estado === 'libre').length,
    ocupado: licenses.filter((l) => l.license.estado === 'ocupado').length,
    mantenimiento: licenses.filter((l) => l.license.estado === 'mantenimiento').length,
  };

  if (loading) {
    return <div className="loading">Cargando licencias...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={loadLicenses}>Reintentar</button>
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
        <h2>📊 Resumen de Licencias</h2>
        <button onClick={loadLicenses} className="btn-refresh">🔄 Actualizar</button>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total de Licencias</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card libre">
          <div className="stat-label">Disponibles</div>
          <div className="stat-value">{stats.libre}</div>
        </div>
        <div className="stat-card ocupado">
          <div className="stat-label">Ocupadas</div>
          <div className="stat-value">{stats.ocupado}</div>
        </div>
        <div className="stat-card mantenimiento">
          <div className="stat-label">Mantenimiento</div>
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
            Todas ({stats.total})
          </button>
          <button
            className={filter === 'libre' ? 'active' : ''}
            onClick={() => setFilter('libre')}
          >
            Disponibles ({stats.libre})
          </button>
          <button
            className={filter === 'ocupado' ? 'active' : ''}
            onClick={() => setFilter('ocupado')}
          >
            Ocupadas ({stats.ocupado})
          </button>
          <button
            className={filter === 'mantenimiento' ? 'active' : ''}
            onClick={() => setFilter('mantenimiento')}
          >
            Mantenimiento ({stats.mantenimiento})
          </button>
        </div>
        <input
          type="text"
          placeholder="🔍 Buscar por email o usuario..."
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
              <th>Email</th>
              <th>Usuario Moodle</th>
              <th>Estado</th>
              <th>Asignado a</th>
              <th>Período</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredLicenses.map((item) => (
              <tr key={item.license._id}>
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
                      {formatDate(item.assignment.fechaInicioUso)} -{' '}
                      {formatDate(item.assignment.fechaFinUso)}
                    </small>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>
                  <button
                    className="btn-small"
                    onClick={() => setSelectedLicenseForDetails(item)}
                    title="Ver detalles"
                  >
                    📋
                  </button>
                  <button
                    className="btn-small"
                    onClick={() => handlePasswordChange(item)}
                    title="Cambiar contraseña de Zoom"
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
          <p>No se encontraron licencias que coincidan con tus criterios.</p>
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

      {selectedLicenseForDetails && (
        <LicenseDetailsModal
          licenseData={selectedLicenseForDetails}
          onClose={() => setSelectedLicenseForDetails(null)}
        />
      )}
    </div>
  );
}
