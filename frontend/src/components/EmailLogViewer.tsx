import { useState, useEffect, useCallback } from 'react';
import { emailLogApi } from '../services/api.service';
import { EmailLog, EmailLogType } from '../types/license.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const LOG_TYPE_LABELS: Record<EmailLogType, string> = {
  assignment_confirmation: 'Confirmación asignación',
  pending_request_notification: 'Solicitud pendiente',
  extension_confirmation: 'Confirmación ampliación',
  expiration_warning: 'Aviso expiración',
  password_changed: 'Contraseña cambiada',
  admin_copy: 'Copia admin',
  test: 'Prueba',
  sample: 'Muestra',
};

const LOG_TYPE_BADGE: Record<EmailLogType, string> = {
  assignment_confirmation: 'badge-active',
  pending_request_notification: 'badge-nueva',
  extension_confirmation: 'badge-extension',
  expiration_warning: 'badge-expired',
  password_changed: 'badge-count',
  admin_copy: 'badge-assigned',
  test: 'badge-pending',
  sample: 'badge-pending',
};

export default function EmailLogViewer() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'' | 'sent' | 'failed'>('');
  const [filterType, setFilterType] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ id: string; msg: string; ok: boolean } | null>(null);
  const [previewLog, setPreviewLog] = useState<EmailLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Parameters<typeof emailLogApi.getLogs>[0] = { limit: 200 };
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.logType = filterType;
      const data = await emailLogApi.getLogs(params);
      setLogs(data.logs);
    } catch (e: any) {
      setError(e.message || 'Error al cargar los logs');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResend = async (log: EmailLog) => {
    setActionLoading(log._id + '_resend');
    setActionResult(null);
    try {
      await emailLogApi.resend(log._id);
      setActionResult({ id: log._id, msg: 'Reenviado correctamente', ok: true });
    } catch (e: any) {
      setActionResult({ id: log._id, msg: e.message || 'Error al reenviar', ok: false });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendAdmins = async (log: EmailLog) => {
    setActionLoading(log._id + '_admins');
    setActionResult(null);
    try {
      await emailLogApi.resendToAdmins(log._id);
      setActionResult({ id: log._id, msg: 'Reenviado a admins correctamente', ok: true });
    } catch (e: any) {
      setActionResult({ id: log._id, msg: e.message || 'Error al reenviar a admins', ok: false });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (iso: string) =>
    format(new Date(iso), "d MMM yyyy, HH:mm", { locale: es });

  return (
    <div className="email-log-viewer">
      <div className="section-header">
        <h2>Log de Emails</h2>
        <button className="btn-refresh" onClick={fetchLogs} disabled={loading}>
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      </div>

      {/* Filters */}
      <div className="filter-row" style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as '' | 'sent' | 'failed')}
          className="filter-select"
        >
          <option value="">Todos los estados</option>
          <option value="sent">Enviados</option>
          <option value="failed">Fallidos</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="filter-select"
        >
          <option value="">Todos los tipos</option>
          {(Object.keys(LOG_TYPE_LABELS) as EmailLogType[]).map((t) => (
            <option key={t} value={t}>{LOG_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-state">Cargando logs…</div>
      ) : logs.length === 0 ? (
        <div className="empty-state">No hay registros de emails.</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Destinatarios</th>
                <th>Asunto</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const busy = actionLoading === log._id + '_resend' || actionLoading === log._id + '_admins';
                return (
                  <tr key={log._id} className={log.status === 'failed' ? 'row-failed' : ''}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(log.createdAt)}</td>
                    <td>
                      <span className={`badge ${LOG_TYPE_BADGE[log.logType] ?? 'badge-pending'}`}>
                        {LOG_TYPE_LABELS[log.logType] ?? log.logType}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px' }}>
                      {log.to.join(', ')}
                    </td>
                    <td style={{ fontSize: '13px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.subject}
                    </td>
                    <td>
                      {log.status === 'sent' ? (
                        <span className="badge badge-active">Enviado</span>
                      ) : (
                        <span className="badge badge-cancelled" title={log.error}>Fallido</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          className="btn-details"
                          title="Ver contenido del email"
                          onClick={() => setPreviewLog(log)}
                        >
                          <img src="/icons/clipboard.png" className="icon-inline" alt="Ver" />
                        </button>
                        <button
                          className="btn btn-sm"
                          disabled={busy}
                          title="Reenviar a destinatarios originales"
                          onClick={() => handleResend(log)}
                          style={{ fontSize: '12px', padding: '3px 8px' }}
                        >
                          {actionLoading === log._id + '_resend' ? '…' : 'Reenviar'}
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          disabled={busy}
                          title="Reenviar solo a admins"
                          onClick={() => handleResendAdmins(log)}
                          style={{ fontSize: '12px', padding: '3px 8px' }}
                        >
                          {actionLoading === log._id + '_admins' ? '…' : 'Solo admins'}
                        </button>
                      </div>
                      {actionResult?.id === log._id && (
                        <div style={{ fontSize: '11px', marginTop: '4px', color: actionResult.ok ? '#15803d' : '#dc2626' }}>
                          {actionResult.msg}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* HTML preview modal */}
      {previewLog && (
        <div className="modal-overlay" onClick={() => setPreviewLog(null)}>
          <div
            className="modal-container"
            style={{ maxWidth: '700px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Vista previa del email</h3>
              <button className="modal-close" onClick={() => setPreviewLog(null)}>✕</button>
            </div>
            <div style={{ padding: '8px 20px 4px', fontSize: '13px', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
              <strong>Para:</strong> {previewLog.to.join(', ')}<br />
              <strong>Asunto:</strong> {previewLog.subject}
              {previewLog.error && (
                <div style={{ color: '#dc2626', marginTop: '4px' }}><strong>Error:</strong> {previewLog.error}</div>
              )}
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
              <iframe
                srcDoc={previewLog.html}
                title="Vista previa"
                style={{ width: '100%', height: '500px', border: 'none' }}
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
