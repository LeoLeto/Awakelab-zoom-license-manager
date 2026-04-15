import { useState, useEffect, useCallback } from 'react';
import { emailLogApi } from '../services/api.service';
import { EmailLog, EmailLogType } from '../types/license.types';

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

// Uses the same two-word `badge <modifier>` convention as the rest of the app
const LOG_TYPE_BADGE: Record<EmailLogType, string> = {
  assignment_confirmation: 'active',
  pending_request_notification: 'upcoming',
  extension_confirmation: 'pending',
  expiration_warning: 'ocupado',
  password_changed: 'mantenimiento',
  admin_copy: 'ocupado',
  test: 'expirado',
  sample: 'expirado',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
      setActionResult({ id: log._id, msg: 'Reenviado a admins', ok: true });
    } catch (e: any) {
      setActionResult({ id: log._id, msg: e.message || 'Error al reenviar a admins', ok: false });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="loading">Cargando emails...</div>;

  return (
    <>
      <div className="assignment-manager">
        <div className="section-header">
          <h2>
            <img src="/icons/messages.png" className="icon-inline" alt="" /> Log de Emails
          </h2>
          <button className="btn-refresh" onClick={fetchLogs}>
            Actualizar
          </button>
        </div>

        {error && <div className="error"><p>{error}</p></div>}

        {/* Filters */}
        <div className="form-section history-filters">
          <div className="form-row">
            <div className="form-group">
              <label>Estado</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as '' | 'sent' | 'failed')}
              >
                <option value="">Todos</option>
                <option value="sent">Enviados</option>
                <option value="failed">Fallidos</option>
              </select>
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">Todos</option>
                {(Object.keys(LOG_TYPE_LABELS) as EmailLogType[]).map((t) => (
                  <option key={t} value={t}>{LOG_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="empty-state">
            <p>No hay registros de emails.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
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
                  const busy =
                    actionLoading === log._id + '_resend' ||
                    actionLoading === log._id + '_admins';
                  return (
                    <tr key={log._id} className={log.status === 'failed' ? 'row-failed' : ''}>
                      <td>{formatDate(log.createdAt)}</td>
                      <td>
                        <span className={`badge ${LOG_TYPE_BADGE[log.logType] ?? 'expirado'}`}>
                          {LOG_TYPE_LABELS[log.logType] ?? log.logType}
                        </span>
                      </td>
                      <td>{log.to.join(', ')}</td>
                      <td className="email-log-subject">{log.subject}</td>
                      <td>
                        {log.status === 'sent' ? (
                          <span className="badge active">Enviado</span>
                        ) : (
                          <span className="badge mantenimiento" title={log.error}>
                            Fallido
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="btn-small"
                            data-tooltip="Ver contenido"
                            onClick={() => setPreviewLog(log)}
                          >
                            <img src="/icons/clipboard.png" className="icon-inline" alt="Ver" />
                          </button>
                          <button
                            className="btn-small"
                            disabled={busy}
                            data-tooltip="Reenviar al destinatario original"
                            onClick={() => handleResend(log)}
                          >
                            {actionLoading === log._id + '_resend' ? '…' : 'Reenviar'}
                          </button>
                          <button
                            className="btn-small"
                            disabled={busy}
                            data-tooltip="Reenviar solo a admins"
                            onClick={() => handleResendAdmins(log)}
                          >
                            {actionLoading === log._id + '_admins' ? '…' : 'Solo admins'}
                          </button>
                        </div>
                        {actionResult?.id === log._id && (
                          <small
                            className={actionResult.ok ? 'form-hint' : 'history-error'}
                            style={{ display: 'block', marginTop: '4px' }}
                          >
                            {actionResult.msg}
                          </small>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* HTML preview modal — same structure as LicenseDetailsModal */}
      {previewLog && (
        <div className="modal-overlay" onClick={() => setPreviewLog(null)}>
          <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <img src="/icons/messages.png" className="icon-inline" alt="" /> Vista previa del email
              </h3>
              <button className="close-button" onClick={() => setPreviewLog(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>
                <strong>Para:</strong> {previewLog.to.join(', ')}<br />
                <strong>Asunto:</strong> {previewLog.subject}
              </p>
              {previewLog.error && (
                <p className="history-error">
                  <strong>Error:</strong> {previewLog.error}
                </p>
              )}
              <iframe
                srcDoc={previewLog.html}
                title="Vista previa"
                style={{ width: '100%', height: '480px', border: 'none', display: 'block', marginTop: '12px' }}
                sandbox="allow-same-origin"
              />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setPreviewLog(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
