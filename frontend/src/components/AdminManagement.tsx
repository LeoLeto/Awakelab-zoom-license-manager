import React, { useState, useEffect } from 'react';
import '../App.css';

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
    return <div className="container"><p>Cargando administradores...</p></div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Gestión de Administradores</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancelar' : 'Agregar Nuevo Administrador'}
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          {successMessage}
        </div>
      )}

      {showCreateForm && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3>Crear Nuevo Administrador</h3>
          <form onSubmit={handleCreateAdmin}>
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="newUsername" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Nombre de usuario (mínimo 3 caracteres)
              </label>
              <input
                type="text"
                id="newUsername"
                className="setting-input"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                minLength={3}
                style={{ width: '100%', maxWidth: '400px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="newPassword" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Contraseña (mínimo 6 caracteres)
              </label>
              <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="newPassword"
                  className="setting-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    color: 'var(--gray-600)',
                    fontSize: '0.875rem'
                  }}
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {formError && (
              <div className="alert alert-error" style={{ marginBottom: '15px' }}>
                {formError}
              </div>
            )}

            <button type="submit" className="btn btn-primary">
              Crear Administrador
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <h3>Administradores Actuales ({admins.length})</h3>
        <table className="table">
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
                    <span style={{ marginLeft: '10px', color: '#666', fontSize: '0.9em' }}>
                      (Sistema)
                    </span>
                  )}
                </td>
                <td>{new Date(admin.createdAt).toLocaleDateString()}</td>
                <td>{admin.createdBy?.username || 'Sistema'}</td>
                <td>
                  {admin.lastLogin
                    ? new Date(admin.lastLogin).toLocaleString()
                    : 'Nunca'}
                </td>
                <td>
                  {admin.username !== 'superadmin' && (
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDeleteAdmin(admin._id, admin.username)}
                      style={{ fontSize: '0.9em', padding: '5px 10px' }}
                    >
                      Eliminar
                    </button>
                  )}
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
