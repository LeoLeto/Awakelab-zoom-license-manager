import { useState } from 'react';
import { licenseApi } from '../services/api.service';
import { LicenseWithAssignment } from '../types/license.types';

interface MaintenanceLicenseModalProps {
  licenseData: LicenseWithAssignment;
  onClose: () => void;
  onSuccess: () => void;
}

const MIN_REASON_LENGTH = 10;

/**
 * Confirmation modal for putting a free license into maintenance mode.
 * This is a rare action, so the admin must provide a written justification
 * (stored in the license history) before the confirm button is enabled.
 */
export default function MaintenanceLicenseModal({
  licenseData,
  onClose,
  onSuccess,
}: MaintenanceLicenseModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = licenseData.license.email;
  const trimmedReason = reason.trim();
  const canConfirm = trimmedReason.length >= MIN_REASON_LENGTH && !loading;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    try {
      setLoading(true);
      setError(null);
      await licenseApi.setMaintenance(licenseData.license._id, trimmedReason);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al poner la licencia en mantenimiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>
          <img src="/icons/monitor.png" className="icon-inline" alt="" /> Poner licencia en mantenimiento
        </h3>

        <div
          style={{
            padding: '12px 16px',
            margin: '12px 0',
            backgroundColor: '#fffbeb',
            border: '1px solid #f59e0b',
            borderLeft: '4px solid #f59e0b',
            borderRadius: '6px',
            color: '#92400e',
            fontSize: '0.9rem',
            lineHeight: 1.5,
          }}
        >
          <strong>Acción poco habitual.</strong>
          <p style={{ margin: '8px 0 0' }}>
            Vas a marcar la licencia <strong>{email}</strong> como{' '}
            <strong>En mantenimiento</strong>. Mientras esté en este estado{' '}
            <strong>no podrá asignarse a docentes</strong>. Podrás devolverla a{' '}
            <strong>Disponible</strong> más adelante desde el resumen de licencias.
          </p>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="form-group">
          <label>
            Justificación <span style={{ color: 'var(--danger-color, #dc2626)' }}>*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explica por qué esta licencia entra en mantenimiento (mínimo 10 caracteres). Ej.: cambio de credenciales pendiente, cuenta bloqueada por Zoom, revisión de seguridad…"
            disabled={loading}
            rows={4}
            autoFocus
            style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
          />
          <small className="text-muted">
            Quedará registrada en el historial de la licencia. {trimmedReason.length}/{MIN_REASON_LENGTH} caracteres mínimos.
          </small>
        </div>

        <div className="button-group">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {loading ? 'Guardando...' : 'Poner en mantenimiento'}
          </button>
        </div>
      </div>
    </div>
  );
}
