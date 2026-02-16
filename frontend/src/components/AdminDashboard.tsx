import { useState } from 'react';
import LicenseOverview from './LicenseOverview';
import AssignmentManager from './AssignmentManager';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments'>('overview');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>🎯 Panel de Administración</h1>
        <p className="subtitle">Gestiona licencias de Zoom y asignaciones</p>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Licencias
        </button>
        <button
          className={`tab ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          📋 Solicitudes
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
      </div>
    </div>
  );
}
