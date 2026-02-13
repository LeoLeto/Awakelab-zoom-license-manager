import { useState } from 'react';
import LicenseOverview from './LicenseOverview';
import AssignmentManager from './AssignmentManager';
import UserList from './UserList';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'users'>('overview');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>🎯 Panel de Administración</h1>
        <p className="subtitle">Gestiona licencias de Zoom, asignaciones y contraseñas de usuarios</p>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Resumen de Licencias
        </button>
        <button
          className={`tab ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          📅 Asignaciones
        </button>
        <button
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Gestión de Contraseñas
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <LicenseOverview refreshTrigger={refreshTrigger} />
        )}
        {activeTab === 'assignments' && (
          <AssignmentManager onAssignmentChange={handleRefresh} />
        )}
        {activeTab === 'users' && <UserList />}
      </div>
    </div>
  );
}
