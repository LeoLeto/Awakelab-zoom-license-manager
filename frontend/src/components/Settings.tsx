import { useState, useEffect } from 'react';

interface Setting {
  _id: string;
  key: string;
  value: any;
  description: string;
  updatedAt: string;
  updatedBy: string;
}

interface SettingsProps {
  onSettingsChange?: () => void;
}

export default function Settings({ onSettingsChange }: SettingsProps) {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar configuraciones');
      }

      const data = await response.json();
      setSettings(data.settings);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      setSaving(key);
      setError(null);
      setSuccessMessage(null);

      const token = localStorage.getItem('authToken');
      const setting = settings.find(s => s.key === key);
      
      const response = await fetch(`/api/settings/${key}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value,
          description: setting?.description || ''
        }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar configuración');
      }

      // Refresh settings
      await fetchSettings();
      setSuccessMessage('Configuración actualizada correctamente');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
      
      if (onSettingsChange) {
        onSettingsChange();
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating setting:', err);
    } finally {
      setSaving(null);
    }
  };

  const renderSettingControl = (setting: Setting) => {
    const isSaving = saving === setting.key;
    
    switch (typeof setting.value) {
      case 'boolean':
        return (
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={setting.value}
              onChange={(e) => updateSetting(setting.key, e.target.checked)}
              disabled={isSaving}
            />
            <span className="slider"></span>
          </label>
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={setting.value}
            onChange={(e) => updateSetting(setting.key, parseInt(e.target.value))}
            disabled={isSaving}
            className="setting-input"
            min="0"
          />
        );
      
      case 'string':
        return (
          <input
            type="text"
            value={setting.value}
            onChange={(e) => updateSetting(setting.key, e.target.value)}
            disabled={isSaving}
            className="setting-input"
          />
        );
      
      default:
        return <span>{JSON.stringify(setting.value)}</span>;
    }
  };

  const getSettingLabel = (key: string): string => {
    const labels: Record<string, string> = {
      autoPasswordRotation: '🔐 Rotación Automática de Contraseñas',
      passwordRotationTime: '🕐 Hora de Rotación',
      notifyOnExpiration: '📧 Notificar Expiración',
      expirationWarningDays: '⏰ Días de Aviso Previo'
    };
    return labels[key] || key;
  };

  if (loading) {
    return (
      <div className="settings-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Cargando configuraciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>⚙️ Configuración del Sistema</h2>
        <p className="subtitle">Ajusta el comportamiento automático del sistema</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>❌</span>
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          <span>✅</span>
          <span>{successMessage}</span>
        </div>
      )}

      <div className="settings-grid">
        {settings.map((setting) => (
          <div key={setting.key} className="setting-card">
            <div className="setting-header">
              <div className="setting-info">
                <h3>{getSettingLabel(setting.key)}</h3>
                <p className="setting-description">{setting.description}</p>
              </div>
              <div className="setting-control">
                {renderSettingControl(setting)}
                {saving === setting.key && <span className="saving-indicator">Guardando...</span>}
              </div>
            </div>
            <div className="setting-meta">
              <small>
                Última actualización: {new Date(setting.updatedAt).toLocaleString('es-ES')}
                {setting.updatedBy && ` por ${setting.updatedBy}`}
              </small>
            </div>
          </div>
        ))}
      </div>

      <div className="settings-info">
        <h3>ℹ️ Información sobre la Rotación Automática</h3>
        <div className="info-box">
          <p>
            <strong>¿Qué hace la rotación automática?</strong><br />
            Cuando una licencia expira, el sistema automáticamente cambia la contraseña 
            de Zoom para esa cuenta, asegurando que los profesores no puedan seguir 
            usándola después de que termine su período asignado.
          </p>
          <p>
            <strong>¿Cuándo se ejecuta?</strong><br />
            La rotación se ejecuta diariamente a las {settings.find(s => s.key === 'passwordRotationTime')?.value || '01:00'} junto con la tarea de marcar asignaciones expiradas.
          </p>
          <p>
            <strong>Seguridad:</strong><br />
            Las nuevas contraseñas se generan automáticamente cumpliendo con los 
            requisitos de seguridad de Zoom (mínimo 8 caracteres, letras, números y 
            caracteres especiales).
          </p>
        </div>
      </div>
    </div>
  );
}
