import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from './Login';
import AdminDashboard from './AdminDashboard';

const AdminPage: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <p>Cargando...</p>
      </div>
    );
  }

  return isAuthenticated ? <AdminDashboard /> : <Login />;
};

export default AdminPage;
