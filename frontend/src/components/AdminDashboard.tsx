import { useState, useEffect } from 'react';
import LicenseOverview from './LicenseOverview';
import AssignmentManager from './AssignmentManager';
import { HistoryViewer } from './HistoryViewer';
import AdminManagement from './AdminManagement';
import Settings from './Settings';
import AnalyticsDashboard from './AnalyticsDashboard';
import EmailLogViewer from './EmailLogViewer';
import { assignmentApi } from '../services/api.service';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'history' | 'admins' | 'analytics' | 'emails' | 'settings'>('overview');
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
      {/* Navigation Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <img src="/icons/monitor.png" className="icon-inline" alt="" /> Licencias
        </button>
        <button
          className={`tab ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          <img src="/icons/clipboard.png" className="icon-inline" alt="" /> Solicitudes
          {pendingCount > 0 && (
            <span className="tab-badge">{pendingCount}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <img src="/icons/clock.png" className="icon-inline" alt="" /> Historial
        </button>
        <button
          className={`tab ${activeTab === 'admins' ? 'active' : ''}`}
          onClick={() => setActiveTab('admins')}
        >
          <img src="/icons/messages.png" className="icon-inline" alt="" /> Administración
        </button>
        <button
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <img src="/icons/chart.png" className="icon-inline" alt="" /> Analytics
        </button>
        <button
          className={`tab ${activeTab === 'emails' ? 'active' : ''}`}
          onClick={() => setActiveTab('emails')}
        >
          <img src="/icons/messages.png" className="icon-inline" alt="" /> Emails
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <img src="/icons/settings.png" className="icon-inline" alt="" /> Configuración
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
        {activeTab === 'emails' && (
          <EmailLogViewer />
        )}
        {activeTab === 'settings' && (
          <Settings onSettingsChange={handleRefresh} />
        )}
      </div>
    </div>
  );
}
