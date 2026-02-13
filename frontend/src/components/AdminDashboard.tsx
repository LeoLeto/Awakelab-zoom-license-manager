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
        <h1>🎯 Admin Dashboard</h1>
        <p className="subtitle">Manage Zoom licenses, assignments, and user passwords</p>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 License Overview
        </button>
        <button
          className={`tab ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          📅 Assignments
        </button>
        <button
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Password Management
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
