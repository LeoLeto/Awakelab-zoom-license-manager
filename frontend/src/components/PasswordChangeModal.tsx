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
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomPassword = async () => {
    if (!customPassword || customPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await zoomApi.changePassword(user.email, customPassword);
      setNewPassword(result.newPassword);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);
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
      setError('Failed to generate password');
    }
  };

  if (success && newPassword) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3>✅ Password Changed Successfully</h3>
          <div className="success-message">
            <p><strong>User:</strong> {user.email}</p>
            <p><strong>New Password:</strong></p>
            <div className="password-display">{newPassword}</div>
            <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>
              Make sure to save this password securely. This window will close automatically.
            </p>
          </div>
          <div className="button-group">
            <button onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>🔐 Change Password</h3>
        
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
          <label>Custom Password (optional)</label>
          <input
            type="text"
            value={customPassword}
            onChange={(e) => setCustomPassword(e.target.value)}
            placeholder="Leave blank to auto-generate"
            disabled={loading}
          />
          <a className="generate-link" onClick={handleGeneratePasswordOnly}>
            Generate secure password
          </a>
        </div>

        <div className="button-group">
          <button 
            className="btn-secondary" 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          
          {customPassword ? (
            <button 
              onClick={handleCustomPassword}
              disabled={loading}
            >
              {loading ? 'Changing...' : 'Set Custom Password'}
            </button>
          ) : (
            <button 
              className="btn-success"
              onClick={handleAutoGenerate}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Auto-Generate & Change'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
