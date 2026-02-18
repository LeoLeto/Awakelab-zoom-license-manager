import { useState, useEffect } from 'react';
import { ZoomUser } from '../types/zoom.types';
import { zoomApi } from '../services/api.service';
import PasswordChangeModal from './PasswordChangeModal';

export default function UserList() {
  const [users, setUsers] = useState<ZoomUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<ZoomUser | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await zoomApi.getUsers();
      setUsers(response.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const getUserTypeLabel = (type: number): { label: string; className: string } => {
    switch (type) {
      case 1:
        return { label: 'Básico', className: 'basic' };
      case 2:
        return { label: 'Licenciado', className: 'licensed' };
      case 3:
        return { label: 'Administrador', className: 'admin' };
      default:
        return { label: 'Desconocido', className: 'basic' };
    }
  };

  if (loading) {
    return <div className="loading">Cargando usuarios de Zoom...</div>;
  }

  if (error) {
    return (
      <div>
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
        <button onClick={loadUsers}>Reintentar</button>
      </div>
    );
  }

  return (
    <>
      <div className="user-list">
        <h2>Usuarios de Zoom</h2>
        <div className="user-stats">
          Total de Usuarios: <strong>{users.length}</strong>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Tipo</th>
              <th>ID de Usuario</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const userType = getUserTypeLabel(user.type);
              return (
                <tr key={user.id}>
                  <td>
                    {user.first_name} {user.last_name}
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`user-type ${userType.className}`}>
                      {userType.label}
                    </span>
                  </td>
                  <td className="user-id">{user.id}</td>
                  <td>
                    <button
                      className="btn-small"
                      onClick={() => setSelectedUser(user)}
                    >
                      Cambiar Contraseña
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <PasswordChangeModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSuccess={() => {
            // Could refresh user list here if needed
            console.log('Contraseña cambiada exitosamente');
          }}
        />
      )}
    </>
  );
}
