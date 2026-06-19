import { useState, useEffect } from 'react';
import { licenseApi } from '../services/api.service';
import { LicenseWithAssignment } from '../types/license.types';
import { formatDate } from '../utils/date';
import PasswordChangeModal from './PasswordChangeModal';
import LicenseDetailsModal from './LicenseDetailsModal';
import FreeLicenseModal from './FreeLicenseModal';
import { ZoomUser } from '../types/zoom.types';

interface LicenseOverviewProps {
  refreshTrigger?: number;
}

export default function LicenseOverview({ refreshTrigger }: LicenseOverviewProps) {
  const [licenses, setLicenses] = useState<LicenseWithAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'libre' | 'ocupado' | 'mantenimiento'>('libre');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<ZoomUser | null>(null);
  const [selectedLicenseForDetails, setSelectedLicenseForDetails] = useState<LicenseWithAssignment | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [licenseToFree, setLicenseToFree] = useState<LicenseWithAssignment | null>(null);
  const [actionMenu, setActionMenu] = useState<{ item: LicenseWithAssignment; x: number; y: number } | null>(null);

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

  // Close the row action menu on any outside click, scroll or resize.
  useEffect(() => {
    if (!actionMenu) return;
    const close = () => setActionMenu(null);
    document.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [actionMenu]);

  const filteredLicenses = licenses.filter((item) => {
    const matchesFilter = filter === 'all' || item.license.estado === filter;
    const matchesSearch = 
      item.license.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.license.usuarioMoodle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.assignment?.nombreApellidos?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (item.assignment?.correocorporativo?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
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

  const handleReleaseFromMaintenance = async (item: LicenseWithAssignment) => {
    const confirmed = window.confirm(
      `¿Marcar la licencia ${item.license.email} como disponible? Saldrá de mantenimiento y podrá asignarse a docentes.`
    );
    if (!confirmed) return;

    try {
      setUpdatingId(item.license._id);
      setError(null);
      await licenseApi.updateLicense(item.license._id, { estado: 'libre' });
      await loadLicenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el estado de la licencia');
    } finally {
      setUpdatingId(null);
    }
  };

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
        <h2><img src="/icons/monitor.png" className="icon-inline-lg" alt="" /> Resumen de Licencias</h2>
        <button onClick={loadLicenses} className="btn-refresh">Actualizar</button>
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

      {stats.libre < 10 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          margin: '12px 0',
          backgroundColor: '#fff3cd',
          border: '1px solid #f59e0b',
          borderLeft: '4px solid #f59e0b',
          borderRadius: '6px',
          color: '#92400e',
          fontSize: '0.9rem',
        }}>
          <span style={{ fontSize: '1.2rem' }}><img src="/icons/shield.png" style={{ width: 20, height: 20 }} alt="" /></span>
          <span>
            <strong>Stock bajo:</strong> solo {stats.libre === 0 ? 'quedan 0 licencias disponibles' : `queda${stats.libre === 1 ? '' : 'n'} ${stats.libre} licencia${stats.libre === 1 ? '' : 's'} disponible${stats.libre === 1 ? '' : 's'}`}.
            Considera liberar licencias ocupadas o agregar nuevas.
          </span>
        </div>
      )}

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
          placeholder="Buscar por email, usuario o asignado..."
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
                  <div className="table-actions">
                    <button
                      className="btn-small"
                      onClick={() => setSelectedLicenseForDetails(item)}
                      data-tooltip="Ver detalles"
                    >
                      <img src="/icons/clipboard.png" className="icon-inline" alt="Ver detalles" />
                    </button>
                    <button
                      className="btn-small"
                      onClick={() => handlePasswordChange(item)}
                      data-tooltip="Cambiar contraseña de Zoom"
                    >
                      <img src="/icons/password.png" className="icon-inline" alt="Cambiar contraseña" />
                    </button>
                    {item.license.estado === 'mantenimiento' && (
                      <button
                        className="btn-small btn-release"
                        onClick={() => handleReleaseFromMaintenance(item)}
                        disabled={updatingId === item.license._id}
                        data-tooltip="Marcar como disponible (salir de mantenimiento)"
                      >
                        {updatingId === item.license._id ? '…' : 'Marcar disponible'}
                      </button>
                    )}
                    {item.license.estado === 'ocupado' && (
                      <button
                        className="btn-small btn-more"
                        aria-haspopup="true"
                        aria-expanded={actionMenu?.item.license._id === item.license._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (actionMenu?.item.license._id === item.license._id) {
                            setActionMenu(null);
                            return;
                          }
                          const rect = e.currentTarget.getBoundingClientRect();
                          setActionMenu({ item, x: rect.right, y: rect.bottom });
                        }}
                        data-tooltip="Más opciones"
                      >
                        ⋮
                      </button>
                    )}
                  </div>
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

      {actionMenu && (
        <div
          className="action-menu-dropdown"
          style={{ top: actionMenu.y + 4, left: actionMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="action-menu-item danger"
            onClick={() => {
              const item = actionMenu.item;
              setActionMenu(null);
              setLicenseToFree(item);
            }}
          >
            Liberar licencia
          </button>
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

      {licenseToFree && (
        <FreeLicenseModal
          licenseData={licenseToFree}
          onClose={() => setLicenseToFree(null)}
          onSuccess={() => {
            setLicenseToFree(null);
            loadLicenses();
          }}
        />
      )}
    </div>
  );
}
