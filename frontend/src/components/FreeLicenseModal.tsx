import { useState } from 'react';
import { licenseApi } from '../services/api.service';
import { LicenseWithAssignment } from '../types/license.types';
import { formatDate } from '../utils/date';

interface FreeLicenseModalProps {
  licenseData: LicenseWithAssignment;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Strong-confirmation modal for force-freeing an occupied license.
 * This is a rare, override action, so the admin must type the license's
 * email exactly to enable the confirm button.
 */
export default function FreeLicenseModal({ licenseData, onClose, onSuccess }: FreeLicenseModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = licenseData.license.email;
  const activeAssignment = licenseData.assignment;
  const canConfirm = confirmText.trim().toLowerCase() === email.toLowerCase() && !loading;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    try {
      setLoading(true);
      setError(null);
      await licenseApi.freeLicense(licenseData.license._id);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al liberar la licencia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ color: 'var(--danger-color, #dc2626)' }}>
          <img src="/icons/shield.png" className="icon-inline" alt="" /> Liberar licencia ocupada
        </h3>

        <div
          style={{
            padding: '12px 16px',
            margin: '12px 0',
            backgroundColor: '#fef2f2',
            border: '1px solid #dc2626',
            borderLeft: '4px solid #dc2626',
            borderRadius: '6px',
            color: '#991b1b',
            fontSize: '0.9rem',
            lineHeight: 1.5,
          }}
        >
          <strong>⚠️ Acción peligrosa y poco habitual.</strong>
          <p style={{ margin: '8px 0 0' }}>
            Vas a forzar la liberación de la licencia <strong>{email}</strong>, devolviéndola al
            estado <strong>Disponible</strong>. Solo deberías hacerlo en casos excepcionales.
          </p>
          {activeAssignment ? (
            <p style={{ margin: '8px 0 0' }}>
              Esta licencia tiene una <strong>asignación activa</strong>. Al liberarla se{' '}
              <strong>cancelará la asignación</strong> y el docente{' '}
              <strong>perderá el acceso</strong> inmediatamente.
            </p>
          ) : (
            <p style={{ margin: '8px 0 0' }}>
              Esta licencia no tiene una asignación activa (por ejemplo, quedó marcada como ocupada
              por error).
            </p>
          )}
        </div>

        {activeAssignment && (
          <div
            style={{
              padding: '12px 16px',
              margin: '0 0 12px',
              backgroundColor: '#fffbeb',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              color: '#92400e',
              fontSize: '0.9rem',
              lineHeight: 1.5,
            }}
          >
            Se cancelará la asignación de:{' '}
            <strong>{activeAssignment.nombreApellidos}</strong> ({activeAssignment.correocorporativo})
            <br />
            Período: {formatDate(activeAssignment.fechaInicioUso)} –{' '}
            {formatDate(activeAssignment.fechaFinUso)}
            <br />
            El docente recibirá un correo informándole que su acceso fue cancelado.
          </div>
        )}

        {error && <div className="error">{error}</div>}

        <div className="form-group">
          <label>
            Para confirmar, escribe el email de la licencia: <strong>{email}</strong>
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={email}
            disabled={loading}
            autoComplete="off"
          />
        </div>

        <div className="button-group">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className="btn-danger"
            onClick={handleConfirm}
            disabled={!canConfirm}
            style={{
              background: canConfirm ? 'var(--danger-color, #dc2626)' : 'var(--gray-300, #d1d5db)',
              color: '#fff',
            }}
          >
            {loading ? 'Liberando...' : 'Liberar licencia'}
          </button>
        </div>
      </div>
    </div>
  );
}
