import React, { useState, useEffect } from 'react';
import { historyApi } from '../services/api.service';
import { HistoryEntry, HistoryFilters } from '../types/history.types';
import { formatDateTime } from '../utils/date';

interface HistoryViewerProps {
  entityType?: 'license' | 'assignment';
  entityId?: string;
  showFilters?: boolean;
  title?: string;
}

const ACTION_CONFIG: Record<string, { label: string; cls: string }> = {
  'create:license':           { label: 'Licencia creada',         cls: 'create' },
  'create:assignment':        { label: 'Solicitud creada',        cls: 'create' },
  'update:license':           { label: 'Licencia actualizada',    cls: 'update' },
  'update:assignment':        { label: 'Asignación actualizada',  cls: 'update' },
  'delete:license':           { label: 'Licencia eliminada',      cls: 'delete' },
  'delete:assignment':        { label: 'Asignación eliminada',   cls: 'delete' },
  'assign:license':           { label: 'Licencia asignada',       cls: 'assign' },
  'assign:assignment':        { label: 'Asignación confirmada',  cls: 'assign' },
  'unassign:license':         { label: 'Licencia liberada',       cls: 'unassign' },
  'unassign:assignment':      { label: 'Asignación cancelada',  cls: 'unassign' },
  'status_change:license':    { label: 'Estado cambiado',         cls: 'status' },
  'status_change:assignment': { label: 'Estado cambiado',         cls: 'status' },
};

const FIELD_NAMES: Record<string, string> = {
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

export const HistoryViewer: React.FC<HistoryViewerProps> = ({
  entityType,
  entityId,
  showFilters = true,
  title = 'Historial de Cambios',
}) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<HistoryFilters>({ limit: 50 });

  useEffect(() => { fetchHistory(); }, [entityType, entityId, filters]);

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
        data = await historyApi.getRecentHistory({ ...filters, entityType });
      }
      setHistory(data.filter((e) => e.entityType !== ('setting' as any)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '(vacío)';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (value instanceof Date) return formatDateTime(value);
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) return formatDateTime(d);
      }
      return value;
    }
    if (typeof value === 'object') {
      if (value.email || value.cuenta) return `${value.email || ''}${value.cuenta ? ` (${value.cuenta})` : ''}`;
      if (value._id) return String(value._id);
      const json = JSON.stringify(value);
      return json.length > 80 ? json.slice(0, 80) + '…' : json;
    }
    return String(value);
  };

  const formatTimestamp = (ts: string) =>
    new Date(ts).toLocaleString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const visibleEntries = history.filter((entry) =>
    entry.changes.some((c) => {
      const o = c.oldValue !== undefined ? formatValue(c.oldValue) : null;
      const n = c.newValue !== undefined ? formatValue(c.newValue) : null;
      return (o !== null && o !== '') || (n !== null && n !== '');
    }) || entry.changes.length === 0
  );

  return (
    <div className="history-viewer">
      <div className="history-viewer-header">
        <h3 className="history-viewer-title">{title}</h3>
        <button onClick={fetchHistory} className="btn-refresh">Actualizar</button>
      </div>

      {showFilters && !entityId && (
        <div className="form-section history-filters">
          <div className="form-row">
            <div className="form-group">
              <label>Tipo</label>
              <select
                value={filters.entityType || ''}
                onChange={(e) => setFilters({ ...filters, entityType: e.target.value ? (e.target.value as 'license' | 'assignment') : undefined })}
              >
                <option value="">Todos</option>
                <option value="license">Licencias</option>
                <option value="assignment">Asignaciones</option>
              </select>
            </div>
            <div className="form-group">
              <label>Acción</label>
              <select
                value={filters.action || ''}
                onChange={(e) => setFilters({ ...filters, action: e.target.value || undefined })}
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
            <div className="form-group">
              <label>Límite</label>
              <select
                value={filters.limit || 50}
                onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="empty-state">Cargando historial…</div>}

      {error && (
        <div className="empty-state history-error">
          <p>Error: {error}</p>
          <button onClick={fetchHistory} className="btn-refresh" style={{ marginTop: '0.75rem' }}>Reintentar</button>
        </div>
      )}

      {!loading && !error && (
        <div className="table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Tipo</th>
                <th>Acción</th>
                <th>Entidad</th>
                <th>Cambios</th>
                <th>Actor</th>
              </tr>
            </thead>
            <tbody>
              {visibleEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="history-empty">No hay historial disponible</td>
                </tr>
              ) : (
                visibleEntries.map((entry) => {
                  const cfg = ACTION_CONFIG[`${entry.action}:${entry.entityType}`] ?? { label: entry.action, cls: 'update' };
                  const entity = entry.metadata?.licenseEmail || entry.metadata?.assignmentName || '—';
                  const changes = entry.changes.filter((c) => {
                    const o = c.oldValue !== undefined ? formatValue(c.oldValue) : null;
                    const n = c.newValue !== undefined ? formatValue(c.newValue) : null;
                    return (o !== null && o !== '') || (n !== null && n !== '');
                  });
                  return (
                    <tr key={entry._id}>
                      <td className="history-ts">{formatTimestamp(entry.timestamp)}</td>
                      <td>
                        <span className={`hbadge hbadge-${entry.entityType}`}>
                          {entry.entityType === 'license' ? 'Licencia' : 'Asignación'}
                        </span>
                      </td>
                      <td>
                        <span className={`hbadge hbadge-${cfg.cls}`}>{cfg.label}</span>
                      </td>
                      <td className="history-entity">{entity}</td>
                      <td>
                        {changes.length === 0 ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <ul className="hchanges">
                            {changes.map((c, i) => {
                              const o = c.oldValue !== undefined ? formatValue(c.oldValue) : null;
                              const n = c.newValue !== undefined ? formatValue(c.newValue) : null;
                              return (
                                <li key={i}>
                                  <span className="hchange-field">{FIELD_NAMES[c.field] ?? c.field}:</span>
                                  {o !== null && o !== '' && <span className="hchange-old">{o}</span>}
                                  {o !== null && o !== '' && n !== null && n !== '' && <span className="hchange-arrow">→</span>}
                                  {n !== null && n !== '' && <span className="hchange-new">{n}</span>}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </td>
                      <td className="history-actor">{entry.actor}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HistoryViewer;
