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
      setError(err instanceof Error ? err.message : 'Failed to load users');
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
        return { label: 'Basic', className: 'basic' };
      case 2:
        return { label: 'Licensed', className: 'licensed' };
      case 3:
        return { label: 'Admin', className: 'admin' };
      default:
        return { label: 'Unknown', className: 'basic' };
    }
  };

  if (loading) {
    return <div className="loading">Loading Zoom users...</div>;
  }

  if (error) {
    return (
      <div>
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
        <button onClick={loadUsers}>Retry</button>
      </div>
    );
  }

  return (
    <>
      <div className="user-list">
        <h2>Zoom Users</h2>
        <div className="user-stats">
          Total Users: <strong>{users.length}</strong>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Type</th>
              <th>User ID</th>
              <th>Actions</th>
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
                      Change Password
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
            console.log('Password changed successfully');
          }}
        />
      )}
    </>
  );
}
