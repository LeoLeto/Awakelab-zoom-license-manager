import { useState } from 'react';
import { ZoomUser } from '../types/zoom.types';
import { zoomApi } from '../services/api.service';

interface PasswordChangeModalProps {
  user: ZoomUser;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PasswordChangeModal({ user, onClose, onSuccess }: PasswordChangeModalProps) {
  const [customPassword, setCustomPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  const handleAutoGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await zoomApi.changePassword(user.email);
      setNewPassword(result.newPassword);
      setSuccess(true);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomPassword = async () => {
    if (!customPassword || customPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await zoomApi.changePassword(user.email, customPassword);
      setNewPassword(result.newPassword);
      setSuccess(true);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePasswordOnly = async () => {
    try {
      const result = await zoomApi.generatePassword(12);
      setCustomPassword(result.password);
    } catch (err) {
      setError('No se pudo generar la contraseña');
    }
  };

  if (success && newPassword) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3>✅ Contraseña Cambiada Exitosamente</h3>
          <div className="success-message">
            <p><strong>Usuario:</strong> {user.email}</p>
            <p><strong>Nueva Contraseña:</strong></p>
            <div className="password-display">{newPassword}</div>
            <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>
              Asegúrate de guardar esta contraseña de forma segura antes de cerrar esta ventana.
            </p>
          </div>
          <div className="button-group">
            <button onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>🔐 Cambiar Contraseña</h3>
        
        <div className="modal-user-info">
          <p><strong>User:</strong> {user.first_name} {user.last_name}</p>
          <p><strong>Email:</strong> {user.email}</p>
        </div>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <div className="form-group">
          <label>Contraseña Personalizada (opcional)</label>
          <input
            type="text"
            value={customPassword}
            onChange={(e) => setCustomPassword(e.target.value)}
            placeholder="Dejar en blanco para generar automáticamente"
            disabled={loading}
          />
          <a className="generate-link" onClick={handleGeneratePasswordOnly}>
            Generar contraseña segura
          </a>
        </div>

        <div className="button-group">
          <button 
            className="btn-secondary" 
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          
          {customPassword ? (
            <button 
              onClick={handleCustomPassword}
              disabled={loading}
            >
              {loading ? 'Cambiando...' : 'Establecer Contraseña Personalizada'}
            </button>
          ) : (
            <button 
              className="btn-success"
              onClick={handleAutoGenerate}
              disabled={loading}
            >
              {loading ? 'Generando...' : 'Auto-Generar y Cambiar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
