import React, { useState, useEffect } from 'react';
import { historyApi } from '../services/api.service';
import { HistoryEntry, HistoryFilters } from '../types/history.types';

interface HistoryViewerProps {
  entityType?: 'license' | 'assignment';
  entityId?: string;
  showFilters?: boolean;
  title?: string;
}

export const HistoryViewer: React.FC<HistoryViewerProps> = ({
  entityType,
  entityId,
  showFilters = true,
  title = 'Historial de Cambios',
}) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<HistoryFilters>({
    limit: 50,
  });

  useEffect(() => {
    fetchHistory();
  }, [entityType, entityId, filters]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      let data: HistoryEntry[];
      
      if (entityId && entityType === 'license') {
        data = await historyApi.getLicenseHistory(entityId, filters.limit || 50);
      } else if (entityId && entityType === 'assignment') {
        data = await historyApi.getAssignmentHistory(entityId, filters.limit || 50);
      } else {
        data = await historyApi.getRecentHistory({
          ...filters,
          entityType: entityType,
        });
      }

      // Exclude configuration/settings entries
      data = data.filter((e) => e.entityType !== 'setting' as any);
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el historial');
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return '➕';
      case 'update':
        return '✏️';
      case 'delete':
        return '🗑️';
      case 'assign':
        return '🔗';
      case 'unassign':
        return '🔓';
      case 'status_change':
        return '🔄';
      default:
        return '📝';
    }
  };

  const getActionLabel = (action: string) => {
    const labels: { [key: string]: string } = {
      create: 'Creado',
      update: 'Actualizado',
      delete: 'Eliminado',
      assign: 'Asignado',
      unassign: 'Desasignado',
      status_change: 'Cambio de Estado',
    };
    return labels[action] || action;
  };

  const formatFieldName = (field: string) => {
    const fieldNames: { [key: string]: string } = {
      cuenta: 'Cuenta',
      email: 'Email',
      estado: 'Estado',
      passwordZoom: 'Contraseña Zoom',
      passwordEmail: 'Contraseña Email',
      observaciones: 'Observaciones',
      licenseId: 'Licencia',
      nombreApellidos: 'Nombre',
      correocorporativo: 'Email Corporativo',
      fechaInicioUso: 'Fecha Inicio',
      fechaFinUso: 'Fecha Fin',
      area: 'Área',
      comunidadAutonoma: 'Comunidad Autónoma',
      tipoUso: 'Tipo de Uso',
      value: 'Valor',
    };
    return fieldNames[field] || field;
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) {
      return '(vacío)';
    }
    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }
    if (value instanceof Date) {
      return value.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    if (typeof value === 'string') {
      // ISO date strings (e.g. "2026-02-25T21:00:00.000Z")
      if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      }
      return value;
    }
    if (typeof value === 'object') {
      // Populated license/assignment document – show meaningful label
      if (value.email || value.cuenta) {
        return `${value.email || ''}${value.cuenta ? ` (${value.cuenta})` : ''}`;
      }
      // ObjectId-like hex string stored as object with _id
      if (value._id) {
        return String(value._id);
      }
      // Fallback: compact JSON (truncated)
      const json = JSON.stringify(value);
      return json.length > 80 ? json.slice(0, 80) + '…' : json;
    }
    return String(value);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="history-viewer">
        <h3>{title}</h3>
        <div className="loading">Cargando historial...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-viewer">
        <h3>{title}</h3>
        <div className="error">Error: {error}</div>
        <button onClick={fetchHistory} className="btn-retry">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="history-viewer">
      <div className="history-header">
        <h3>{title}</h3>
        <button onClick={fetchHistory} className="btn-refresh">
          🔄 Actualizar
        </button>
      </div>

      {showFilters && !entityId && (
        <div className="history-filters">
          <div className="filter-group">
            <label>Tipo de Entidad:</label>
            <select
              value={filters.entityType || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  entityType: e.target.value ? (e.target.value as 'license' | 'assignment') : undefined,
                })
              }
            >
              <option value="">Todos</option>
              <option value="license">Licencias</option>
              <option value="assignment">Asignaciones</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Acción:</label>
            <select
              value={filters.action || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  action: e.target.value || undefined,
                })
              }
            >
              <option value="">Todas</option>
              <option value="create">Crear</option>
              <option value="update">Actualizar</option>
              <option value="delete">Eliminar</option>
              <option value="assign">Asignar</option>
              <option value="unassign">Desasignar</option>
              <option value="status_change">Cambio de Estado</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Límite:</label>
            <select
              value={filters.limit || 50}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  limit: parseInt(e.target.value),
                })
              }
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
        </div>
      )}

      <div className="history-timeline">
        {history.length === 0 ? (
          <div className="no-history">No hay historial disponible</div>
        ) : (
          history
            .filter((entry) => {
              // Hide entries where every change would render as empty
              const hasVisibleChange = entry.changes.some((change) => {
                const oldFormatted = change.oldValue !== undefined ? formatValue(change.oldValue) : null;
                const newFormatted = change.newValue !== undefined ? formatValue(change.newValue) : null;
                return (oldFormatted !== null && oldFormatted !== '') || (newFormatted !== null && newFormatted !== '');
              });
              return hasVisibleChange || entry.changes.length === 0;
            })
            .map((entry) => (
            <div key={entry._id} className="history-entry">
              <div className="entry-header">
                <span className="entry-icon">{getActionIcon(entry.action)}</span>
                <span className="entry-action">{getActionLabel(entry.action)}</span>
                <span className="entry-type">
                  {entry.entityType === 'license' ? '📋 Licencia' : '👤 Asignación'}
                </span>
                <span className="entry-timestamp">{formatTimestamp(entry.timestamp)}</span>
              </div>

              {entry.metadata && (
                <div className="entry-metadata">
                  {entry.metadata.licenseEmail && (
                    <span className="metadata-item">📧 {entry.metadata.licenseEmail}</span>
                  )}
                  {entry.metadata.assignmentName && (
                    <span className="metadata-item">👤 {entry.metadata.assignmentName}</span>
                  )}
                  {entry.metadata.reason && (
                    <span className="metadata-reason">💭 {entry.metadata.reason}</span>
                  )}
                </div>
              )}

              <div className="entry-changes">
                {entry.changes
                  .filter((change) => {
                    const oldFormatted = change.oldValue !== undefined ? formatValue(change.oldValue) : null;
                    const newFormatted = change.newValue !== undefined ? formatValue(change.newValue) : null;
                    // Skip changes where both sides are empty/blank
                    const hasOld = oldFormatted !== null && oldFormatted !== '';
                    const hasNew = newFormatted !== null && newFormatted !== '';
                    return hasOld || hasNew;
                  })
                  .map((change, idx) => {
                    const oldFormatted = change.oldValue !== undefined ? formatValue(change.oldValue) : null;
                    const newFormatted = change.newValue !== undefined ? formatValue(change.newValue) : null;
                    return (
                      <div key={idx} className="change-item">
                        <span className="change-field">{formatFieldName(change.field)}:</span>
                        {oldFormatted !== null && oldFormatted !== '' && (
                          <span className="change-old-value">
                            <span className="value-label">Anterior:</span>
                            <span className="value">{oldFormatted}</span>
                          </span>
                        )}
                        {newFormatted !== null && newFormatted !== '' && (
                          <span className="change-new-value">
                            <span className="value-label">Nuevo:</span>
                            <span className="value">{newFormatted}</span>
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>

              <div className="entry-footer">
                <span className="entry-actor">Por: {entry.actor}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .history-viewer {
          padding: 20px;
          background: #f9f9f9;
          border-radius: 8px;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .history-header h3 {
          margin: 0;
          color: #333;
        }

        .btn-refresh, .btn-retry {
          padding: 8px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .btn-refresh:hover, .btn-retry:hover {
          background: #0056b3;
        }

        .history-filters {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
          padding: 15px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .filter-group label {
          font-size: 12px;
          font-weight: 600;
          color: #666;
        }

        .filter-group select {
          padding: 6px 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .history-timeline {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        @media (max-width: 1100px) {
          .history-timeline {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 680px) {
          .history-timeline {
            grid-template-columns: 1fr;
          }
        }

        .history-entry {
          background: white;
          border-left: 4px solid #007bff;
          border-radius: 8px;
          padding: 10px 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
          font-size: 13px;
          min-width: 0;
        }

        .history-entry:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }

        .change-item .value {
          word-break: break-word;
          overflow-wrap: anywhere;
          white-space: normal;
        }

        .entry-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          font-weight: 600;
          flex-wrap: wrap;
        }

        .entry-icon {
          font-size: 15px;
        }

        .entry-action {
          color: #007bff;
          font-size: 13px;
        }

        .entry-type {
          color: #666;
          font-size: 13px;
        }

        .entry-timestamp {
          margin-left: auto;
          color: #999;
          font-size: 13px;
          font-weight: normal;
          white-space: nowrap;
        }

        .entry-metadata {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 8px;
          padding: 5px 8px;
          background: #f0f8ff;
          border-radius: 4px;
        }

        .metadata-item {
          font-size: 13px;
          color: #555;
        }

        .metadata-reason {
          font-size: 13px;
          color: #666;
          font-style: italic;
        }

        .entry-changes {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 4px;
          margin-bottom: 8px;
        }

        .change-item {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          font-size: 13px;
          padding: 3px 0;
          border-bottom: 1px solid #e9ecef;
        }

        .change-item:last-child {
          border-bottom: none;
        }

        .change-field {
          font-weight: 600;
          color: #333;
          min-width: 100px;
        }

        .change-old-value, .change-new-value {
          display: flex;
          gap: 5px;
          align-items: flex-start;
        }

        .value-label {
          font-size: 13px;
          color: #666;
        }

        .change-old-value .value {
          color: #dc3545;
          text-decoration: line-through;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .change-new-value .value {
          color: #28a745;
          font-weight: 500;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .entry-footer {
          display: flex;
          justify-content: flex-end;
          padding-top: 8px;
          border-top: 1px solid #e9ecef;
        }

        .entry-actor {
          font-size: 12px;
          color: #666;
        }

        .loading, .error, .no-history {
          text-align: center;
          padding: 40px;
          color: #666;
          background: white;
          border-radius: 8px;
        }

        .error {
          color: #dc3545;
        }
      `}</style>
    </div>
  );
};

export default HistoryViewer;
