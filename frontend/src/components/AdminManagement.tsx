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

  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admins', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admins');
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
        throw new Error(error.error || 'Failed to create admin');
      }

      setSuccessMessage('Admin created successfully');
      setNewUsername('');
      setNewPassword('');
      setShowCreateForm(false);
      fetchAdmins();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDeleteAdmin = async (id: string, username: string) => {
    if (!confirm(`Are you sure you want to delete admin "${username}"?`)) {
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
        throw new Error(error.error || 'Failed to delete admin');
      }

      setSuccessMessage('Admin deleted successfully');
      fetchAdmins();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (isLoading) {
    return <div className="container"><p>Loading admins...</p></div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Administrator Management</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'Add New Admin'}
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
          <h3>Create New Administrator</h3>
          <form onSubmit={handleCreateAdmin}>
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="newUsername" style={{ display: 'block', marginBottom: '5px' }}>
                Username (minimum 3 characters)
              </label>
              <input
                type="text"
                id="newUsername"
                className="input"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                minLength={3}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="newPassword" style={{ display: 'block', marginBottom: '5px' }}>
                Password (minimum 6 characters)
              </label>
              <input
                type="password"
                id="newPassword"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {formError && (
              <div className="alert alert-error" style={{ marginBottom: '15px' }}>
                {formError}
              </div>
            )}

            <button type="submit" className="btn btn-primary">
              Create Admin
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <h3>Current Administrators ({admins.length})</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Created</th>
              <th>Created By</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin._id}>
                <td>
                  <strong>{admin.username}</strong>
                  {admin.username === 'Superadmin' && (
                    <span style={{ marginLeft: '10px', color: '#666', fontSize: '0.9em' }}>
                      (System)
                    </span>
                  )}
                </td>
                <td>{new Date(admin.createdAt).toLocaleDateString()}</td>
                <td>{admin.createdBy?.username || 'System'}</td>
                <td>
                  {admin.lastLogin
                    ? new Date(admin.lastLogin).toLocaleString()
                    : 'Never'}
                </td>
                <td>
                  {admin.username !== 'Superadmin' && (
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDeleteAdmin(admin._id, admin.username)}
                      style={{ fontSize: '0.9em', padding: '5px 10px' }}
                    >
                      Delete
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
