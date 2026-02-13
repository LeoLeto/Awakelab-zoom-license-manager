import { useState } from 'react';
import TeacherRequestForm from './TeacherRequestForm';
import TeacherAssignments from './TeacherAssignments';

export default function TeacherPortal() {
  const [activeTab, setActiveTab] = useState<'request' | 'assignments'>('request');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRequestSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    setActiveTab('assignments');
  };

  return (
    <div className="teacher-portal">
      <div className="dashboard-header">
        <h1>👨‍🏫 Teacher Portal</h1>
        <p className="subtitle">Request and manage your Zoom licenses</p>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'request' ? 'active' : ''}`}
          onClick={() => setActiveTab('request')}
        >
          📝 Request License
        </button>
        <button
          className={`tab ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          📋 My Assignments
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'request' && (
          <TeacherRequestForm onSuccess={handleRequestSuccess} />
        )}
        {activeTab === 'assignments' && (
          <TeacherAssignments refreshTrigger={refreshTrigger} />
        )}
      </div>
    </div>
  );
}
