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
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');

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

  const testEmailConfiguration = async () => {
    if (!testEmailAddress) {
      setError('Por favor ingresa un correo de prueba');
      return;
    }
    
    try {
      setTestingEmail(true);
      setError(null);
      setSuccessMessage(null);

      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail: testEmailAddress
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al enviar correo de prueba');
      }

      setSuccessMessage(`✅ Correo de prueba enviado a ${testEmailAddress}`);
      setTestEmailAddress('');
      
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message);
      console.error('Error testing email:', err);
    } finally {
      setTestingEmail(false);
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
            style={{ minWidth: '100px', maxWidth: '150px' }}
          />
        );
      
      case 'string':
        const inputType = setting.key === 'emailPassword' ? 'password' : 'text';
        const isLongText = ['emailHost', 'emailUser', 'emailFrom', 'adminNotificationEmails'].includes(setting.key);
        
        return (
          <input
            type={inputType}
            value={setting.value}
            onChange={(e) => updateSetting(setting.key, e.target.value)}
            onBlur={(e) => updateSetting(setting.key, e.target.value)}
            disabled={isSaving}
            className="setting-input"
            placeholder={setting.key === 'adminNotificationEmails' ? 'admin1@example.com, admin2@example.com' : ''}
            style={{ minWidth: isLongText ? '300px' : '200px' }}
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
      expirationWarningDays: '⏰ Días de Aviso Previo',
      emailHost: '🌐 Servidor SMTP',
      emailPort: '🔌 Puerto SMTP',
      emailSecure: '🔒 Usar SSL/TLS',
      emailUser: '👤 Usuario SMTP',
      emailPassword: '🔑 Contraseña SMTP',
      emailFrom: '📤 Remitente',
      adminNotificationEmails: '👥 Correos Administradores',
      notifyOnPasswordChange: '🔐 Notificar Cambio de Contraseña',
      notifyOnNewRequest: '📋 Notificar Nuevas Solicitudes'
    };
    return labels[key] || key;
  };
  
  const getSettingCategory = (key: string): string => {
    const emailKeys = [
      'emailHost', 'emailPort', 'emailSecure', 'emailUser', 
      'emailPassword', 'emailFrom', 'adminNotificationEmails',
      'notifyOnPasswordChange', 'notifyOnNewRequest'
    ];
    if (emailKeys.includes(key)) return 'email';
    return 'general';
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

      {/* General Settings */}
      <div className="settings-section">
        <div className="section-card">
          <h3 className="section-card-title">🔧 Configuración General</h3>
          <div className="settings-table">
            {settings.filter(s => getSettingCategory(s.key) === 'general').map((setting) => (
              <div key={setting.key} className="setting-row">
                <div className="setting-label">
                  <span className="label-text">{getSettingLabel(setting.key)}</span>
                  <span className="label-description">{setting.description}</span>
                </div>
                <div className="setting-value">
                  {renderSettingControl(setting)}
                  {saving === setting.key && <span className="saving-indicator">💾</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Email Settings */}
      <div className="settings-section">
        <div className="section-card">
          <h3 className="section-card-title">📧 Configuración de Correo Electrónico</h3>
          <p className="section-card-subtitle">Configure los parámetros SMTP para el envío de notificaciones automáticas</p>
          
          <div className="settings-table">
            {settings.filter(s => getSettingCategory(s.key) === 'email').map((setting) => (
              <div key={setting.key} className="setting-row">
                <div className="setting-label">
                  <span className="label-text">{getSettingLabel(setting.key)}</span>
                  <span className="label-description">{setting.description}</span>
                </div>
                <div className="setting-value">
                  {renderSettingControl(setting)}
                  {saving === setting.key && <span className="saving-indicator">💾</span>}
                </div>
              </div>
            ))}
          </div>
          
          {/* Test Email Section */}
          <div className="test-email-section">
            <h4>🧪 Probar Configuración de Correo</h4>
            <p className="test-email-description">
              Envía un correo de prueba para verificar que la configuración SMTP es correcta
            </p>
            <div className="test-email-controls">
              <input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="tu@correo.com"
                className="test-email-input"
                disabled={testingEmail}
              />
              <button
                onClick={testEmailConfiguration}
                disabled={testingEmail || !testEmailAddress}
                className="test-email-button"
              >
                {testingEmail ? '📤 Enviando...' : '📧 Enviar Correo de Prueba'}
              </button>
            </div>
          </div>
        </div>
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
      
      <div className="settings-info">
        <h3>📧 Información sobre Notificaciones por Correo</h3>
        <div className="info-box">
          <p>
            <strong>Notificaciones de Expiración:</strong><br />
            Los docentes recibirán un correo de advertencia {settings.find(s => s.key === 'expirationWarningDays')?.value || 2} días antes 
            de que expire su licencia asignada.
          </p>
          <p>
            <strong>Confirmación de Asignación:</strong><br />
            Cuando un administrador aprueba una solicitud, el docente recibe automáticamente 
            un correo con las credenciales de acceso.
          </p>
          <p>
            <strong>Notificaciones de Administrador:</strong><br />
            Los administradores pueden recibir notificaciones de nuevas solicitudes pendientes 
            y cambios de contraseña automáticos (configurables).
          </p>
        </div>
      </div>
    </div>
  );
}
