import { useState, useEffect } from 'react';
import LicenseOverview from './LicenseOverview';
import AssignmentManager from './AssignmentManager';
import { HistoryViewer } from './HistoryViewer';
import AdminManagement from './AdminManagement';
import Settings from './Settings';
import AnalyticsDashboard from './AnalyticsDashboard';
import { assignmentApi } from '../services/api.service';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'history' | 'admins' | 'analytics' | 'settings'>('overview');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const response = await assignmentApi.getPendingAssignments();
        setPendingCount(response.assignments.length);
      } catch {
        // silently ignore
      }
    };
    fetchPendingCount();
  }, [refreshTrigger]);

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
          {pendingCount > 0 && (
            <span className="tab-badge">{pendingCount}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 Historial
        </button>
        <button
          className={`tab ${activeTab === 'admins' ? 'active' : ''}`}
          onClick={() => setActiveTab('admins')}
        >
          👥 Administradores
        </button>
        <button
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📈 Analytics
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Configuración
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
        {activeTab === 'history' && (
          <HistoryViewer showFilters={true} title="Historial de Cambios" />
        )}
        {activeTab === 'admins' && (
          <AdminManagement />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard />
        )}
        {activeTab === 'settings' && (
          <Settings onSettingsChange={handleRefresh} />
        )}
      </div>
    </div>
  );
}
