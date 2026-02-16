import React from 'react';
import { HistoryViewer } from './HistoryViewer';

export const HistoryDashboard: React.FC = () => {
  return (
    <div className="history-dashboard">
      <div className="dashboard-header">
        <h2>📜 Panel de Historial</h2>
        <p>Visualiza todos los cambios realizados en las licencias y asignaciones</p>
      </div>

      <div className="dashboard-content">
        <HistoryViewer showFilters={true} title="Historial Completo" />
      </div>

      <style>{`
        .history-dashboard {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .dashboard-header {
          margin-bottom: 30px;
          text-align: center;
        }

        .dashboard-header h2 {
          color: #333;
          margin-bottom: 10px;
        }

        .dashboard-header p {
          color: #666;
          font-size: 16px;
        }

        .dashboard-content {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
};

export default HistoryDashboard;
