import React, { useState, useEffect } from 'react';
import '../App.css';
import { formatDate } from '../utils/date';

interface Admin {
  _id: string;
  username: string;
  createdAt: string;
  createdBy?: {
    username: string;
  };
  lastLogin?: string;
}

const AdminManagement: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admins', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar administradores');
      }

      const data = await response.json();
      setAdmins(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ username: newUsername, password: newPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear administrador');
      }

      setSuccessMessage('Administrador creado exitosamente');
      setNewUsername('');
      setNewPassword('');
      setShowCreateForm(false);
      fetchAdmins();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDeleteAdmin = async (id: string, username: string) => {
    if (!confirm(`¿Está seguro de que desea eliminar al administrador "${username}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/admins/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar administrador');
      }

      setSuccessMessage('Administrador eliminado exitosamente');
      fetchAdmins();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (isLoading) {
    return <div className="loading">Cargando administradores...</div>;
  }

  return (
    <div className="assignment-manager">
      <div className="section-header">
        <h2><img src="/icons/messages.png" className="icon-inline" alt="" /> Gestión de Administradores</h2>
        <button
          className="btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? '✖ Cancelar' : '+ Agregar Administrador'}
        </button>
      </div>

      {error && <div className="error"><p>{error}</p></div>}
      {successMessage && <div className="success"><p>{successMessage}</p></div>}

      {showCreateForm && (
        <div className="card">
          <h3>Crear Nuevo Administrador</h3>
          <form onSubmit={handleCreateAdmin} className="assignment-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="newUsername">Nombre de usuario (mínimo 3 caracteres)</label>
                <input
                  type="text"
                  id="newUsername"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  minLength={3}
                />
              </div>
              <div className="form-group">
                <label htmlFor="newPassword">Contraseña (mínimo 6 caracteres)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="btn-details"
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}
                    title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? '○' : '●'}
                  </button>
                </div>
              </div>
            </div>

            {formError && <div className="error"><p>{formError}</p></div>}

            <div className="form-actions">
              <button type="submit" className="btn-primary">Crear Administrador</button>
              <button type="button" className="btn-secondary" onClick={() => setShowCreateForm(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre de Usuario</th>
              <th>Creado</th>
              <th>Creado Por</th>
              <th>Último Acceso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin._id}>
                <td>
                  <strong>{admin.username}</strong>
                  {admin.username === 'superadmin' && (
                    <span className="text-muted"> (Sistema)</span>
                  )}
                </td>
                <td>{formatDate(admin.createdAt)}</td>
                <td>{admin.createdBy?.username || 'Sistema'}</td>
                <td>
                  {admin.lastLogin
                    ? new Date(admin.lastLogin).toLocaleString()
                    : 'Nunca'}
                </td>
                <td>
                  <div className="table-actions">
                    {admin.username !== 'superadmin' && (
                      <button
                        className="btn-danger btn-small"
                        onClick={() => handleDeleteAdmin(admin._id, admin.username)}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminManagement;
