import { useState, useEffect, useRef } from 'react';
import TeacherRequestForm from './TeacherRequestForm';
import TeacherAssignments from './TeacherAssignments';

export default function TeacherPortal() {
  const [activeTab, setActiveTab] = useState<'request' | 'assignments'>('request');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRequestSuccess = (email: string) => {
    setSubmittedEmail(email);
    setShowSuccessBanner(true);
    setRefreshTrigger((prev) => prev + 1);
    setActiveTab('assignments');
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setShowSuccessBanner(false), 6000);
  };

  useEffect(() => () => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
  }, []);

  return (
    <div className="teacher-portal">
      {/* Navigation Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'request' ? 'active' : ''}`}
          onClick={() => setActiveTab('request')}
        >
          <img src="/icons/clipboard.png" className="icon-inline" alt="" /> Solicitar Licencia
        </button>
        <button
          className={`tab ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          <img src="/icons/calendar.png" className="icon-inline" alt="" /> Mis Asignaciones
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'request' && (
          <TeacherRequestForm onSuccess={handleRequestSuccess} />
        )}
        {activeTab === 'assignments' && (
          <>
            {showSuccessBanner && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 18px',
                marginBottom: '16px',
                backgroundColor: '#d1fae5',
                border: '1px solid #6ee7b7',
                borderLeft: '4px solid #10b981',
                borderRadius: '6px',
                color: '#065f46',
                fontSize: '0.95rem',
              }}>
                <span style={{ fontSize: '1.3rem' }}><img src="/icons/chart.png" style={{ width: 20, height: 20 }} alt="" /></span>
                <span>
                  <strong>¡Solicitud enviada correctamente!</strong> Tu solicitud ha sido recibida y está pendiente de aprobación por el administrador.
                </span>
                <button
                  onClick={() => setShowSuccessBanner(false)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#065f46' }}
                  aria-label="Cerrar"
                >×</button>
              </div>
            )}
            <TeacherAssignments refreshTrigger={refreshTrigger} teacherEmail={submittedEmail} />
          </>
        )}
      </div>
    </div>
  );
}
