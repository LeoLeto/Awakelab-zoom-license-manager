import React from 'react';
import { HistoryViewer } from './HistoryViewer';

export const HistoryDashboard: React.FC = () => (
  <div className="history-dashboard">
    <HistoryViewer showFilters={true} title="Historial Completo" />
  </div>
);

export default HistoryDashboard;
