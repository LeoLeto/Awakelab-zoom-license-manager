import { useState, useEffect } from 'react';
import { settingsApi } from '../services/api.service';

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
  const [localValues, setLocalValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [newArea, setNewArea] = useState('');
  const [savingAreas, setSavingAreas] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [savingAdminEmails, setSavingAdminEmails] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [savingDomains, setSavingDomains] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  // Keep localValues in sync when settings are (re)loaded,
  // but don't overwrite keys the user is currently editing
  useEffect(() => {
    setLocalValues(prev => {
      const next = { ...prev };
      settings.forEach(s => {
        if (!(s.key in next)) next[s.key] = s.value;
      });
      return next;
    });
  }, [settings]);

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

      const updated = await response.json();

      // Update only the changed setting in-place — no full refetch, no scroll jump
      setSettings(prev =>
        prev.map(s => s.key === key ? { ...s, value, updatedAt: updated.setting?.updatedAt || s.updatedAt } : s)
      );
      setLocalValues(prev => { const n = { ...prev }; delete n[key]; return n; });
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

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Error al enviar correo de prueba');
      }

      setSuccessMessage(`✅ Correo de prueba enviado a ${testEmailAddress}`);
      // Do NOT clear the address so the button stays enabled for re-testing
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message);
      console.error('Error testing email:', err);
    } finally {
      setTestingEmail(false);
    }
  };

  // ── Area/Departamento helpers ─────────────────────────────────────────────
  const getCurrentAreas = (): string[] => {
    const s = settings.find(s => s.key === 'areaDepartamento');
    return Array.isArray(s?.value) ? s.value : [];
  };

  const saveAreas = async (updatedList: string[]) => {
    try {
      setSavingAreas(true);
      setError(null);
      const updated = await settingsApi.updateSetting(
        'areaDepartamento',
        updatedList,
        'Lista de áreas/departamentos disponibles en el formulario de solicitud'
      );
      setSettings(prev =>
        prev.map(s =>
          s.key === 'areaDepartamento'
            ? { ...s, value: updatedList, updatedAt: updated.setting?.updatedAt || s.updatedAt }
            : s
        )
      );
      setSuccessMessage('Lista de áreas actualizada correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingAreas(false);
    }
  };

  const handleAddArea = () => {
    const trimmed = newArea.trim().toUpperCase();
    if (!trimmed) return;
    const current = getCurrentAreas();
    if (current.includes(trimmed)) {
      setError('Esa área ya existe en la lista');
      return;
    }
    setNewArea('');
    saveAreas([...current, trimmed]);
  };

  const handleRemoveArea = (area: string) => {
    saveAreas(getCurrentAreas().filter(a => a !== area));
  };

  // ── Admin Notification Emails helpers ─────────────────────────────────────
  const getCurrentAdminEmails = (): string[] => {
    const s = settings.find(s => s.key === 'adminNotificationEmails');
    if (Array.isArray(s?.value)) return s.value;
    if (typeof s?.value === 'string' && s.value)
      return s.value.split(',').map((e: string) => e.trim()).filter(Boolean);
    return [];
  };

  const saveAdminEmails = async (updatedList: string[]) => {
    try {
      setSavingAdminEmails(true);
      setError(null);
      const updated = await settingsApi.updateSetting(
        'adminNotificationEmails',
        updatedList,
        'Correos de administradores que reciben notificaciones del sistema'
      );
      setSettings(prev =>
        prev.map(s =>
          s.key === 'adminNotificationEmails'
            ? { ...s, value: updatedList, updatedAt: updated.setting?.updatedAt || s.updatedAt }
            : s
        )
      );
      setSuccessMessage('Lista de correos actualizada correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingAdminEmails(false);
    }
  };

  const handleAddAdminEmail = () => {
    const trimmed = newAdminEmail.trim().toLowerCase();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Por favor ingresa un correo electrónico válido');
      return;
    }
    const current = getCurrentAdminEmails();
    if (current.includes(trimmed)) {
      setError('Ese correo ya está en la lista');
      return;
    }
    setNewAdminEmail('');
    saveAdminEmails([...current, trimmed]);
  };

  const handleRemoveAdminEmail = (email: string) => {
    saveAdminEmails(getCurrentAdminEmails().filter(e => e !== email));
  };

  // ── Accepted Domains helpers ─────────────────────────────────────────────
  const getCurrentDomains = (): string[] => {
    const s = settings.find(s => s.key === 'acceptedDomains');
    if (Array.isArray(s?.value)) return s.value;
    if (typeof s?.value === 'string' && s.value)
      return s.value.split(',').map((d: string) => d.trim()).filter(Boolean);
    return [];
  };

  const saveDomains = async (updatedList: string[]) => {
    try {
      setSavingDomains(true);
      setError(null);
      const updated = await settingsApi.updateSetting(
        'acceptedDomains',
        updatedList,
        'Dominios corporativos aceptados en el formulario de solicitud de licencia'
      );
      setSettings(prev =>
        prev.map(s =>
          s.key === 'acceptedDomains'
            ? { ...s, value: updatedList, updatedAt: updated.setting?.updatedAt || s.updatedAt }
            : s
        )
      );
      setSuccessMessage('Lista de dominios actualizada correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingDomains(false);
    }
  };

  const handleAddDomain = () => {
    // Accept formats: "empresa.com" or "@empresa.com"
    const raw = newDomain.trim().toLowerCase().replace(/^@/, '');
    if (!raw) return;
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/.test(raw)) {
      setError('Por favor ingresa un dominio válido (ej: empresa.com)');
      return;
    }
    const current = getCurrentDomains();
    if (current.includes(raw)) {
      setError('Ese dominio ya está en la lista');
      return;
    }
    setNewDomain('');
    saveDomains([...current, raw]);
  };

  const handleRemoveDomain = (domain: string) => {
    saveDomains(getCurrentDomains().filter(d => d !== domain));
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
            value={localValues[setting.key] ?? setting.value}
            onChange={(e) => setLocalValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
            onBlur={(e) => updateSetting(setting.key, parseInt(e.target.value))}
            disabled={isSaving}
            className="setting-input"
            min="0"
          />
        );
      
      case 'string':
        const inputType = setting.key === 'emailPassword' ? 'password' : 'text';
        
        return (
          <input
            type={inputType}
            value={localValues[setting.key] ?? setting.value}
            onChange={(e) => setLocalValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
            onBlur={(e) => updateSetting(setting.key, e.target.value)}
            disabled={isSaving}
            className="setting-input"
            placeholder={setting.key === 'adminNotificationEmails' ? 'admin1@example.com, admin2@example.com' : ''}
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
      notifyOnNewRequest: '📋 Notificar Nuevas Solicitudes',
      areaDepartamento: '🏢 Áreas / Departamentos',
      acceptedDomains: '🌐 Dominios Aceptados'
    };
    return labels[key] || key;
  };
  
  const getSettingCategory = (key: string): string => {
    if (key === 'areaDepartamento') return 'areas';
    if (key === 'acceptedDomains') return 'domains';
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
          {(() => {
            const wideKeys = ['adminNotificationEmails'];
            return (
              <div className="settings-table">
                {settings.filter(s => getSettingCategory(s.key) === 'general').map((setting) => (
                  <div key={setting.key} className={`setting-row${wideKeys.includes(setting.key) ? ' setting-row--full' : ''}`}>
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
            );
          })()}
        </div>
      </div>

      {/* Email Settings */}
      <div className="settings-section">
        <div className="section-card">
          <h3 className="section-card-title">📧 Configuración de Correo Electrónico</h3>
          <p className="section-card-subtitle">Configure los parámetros SMTP para el envío de notificaciones automáticas</p>
          
          {(() => {
            return (
              <div className="settings-table">
                {settings.filter(s => getSettingCategory(s.key) === 'email' && s.key !== 'adminNotificationEmails').map((setting) => (
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
            );
          })()}
          
          {/* Admin Notification Emails */}
          <div className="setting-row setting-row--full" style={{ marginTop: '16px', borderTop: '1px solid #e9ecef', paddingTop: '16px' }}>
            <div className="setting-label" style={{ marginBottom: '10px' }}>
              <span className="label-text">👥 Correos Administradores</span>
              <span className="label-description">
                {settings.find(s => s.key === 'adminNotificationEmails')?.description || 'Correos de administradores que reciben notificaciones del sistema'}
              </span>
            </div>
            <div>
              {/* Email tag list */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {getCurrentAdminEmails().map((email) => (
                  <span
                    key={email}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      backgroundColor: '#e8f4fd',
                      border: '1px solid #b8daee',
                      borderRadius: '16px',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                    }}
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveAdminEmail(email)}
                      disabled={savingAdminEmails}
                      title="Eliminar"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#721c24',
                        padding: '0',
                        lineHeight: 1,
                        fontSize: '1rem',
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {getCurrentAdminEmails().length === 0 && (
                  <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>No hay correos configurados.</span>
                )}
              </div>
              {/* Add new email */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAdminEmail(); } }}
                  placeholder="admin@ejemplo.com"
                  disabled={savingAdminEmails}
                  className="setting-input"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleAddAdminEmail}
                  disabled={savingAdminEmails || !newAdminEmail.trim()}
                >
                  {savingAdminEmails ? '💾 Guardando...' : '+ Añadir'}
                </button>
              </div>
            </div>
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

      {/* ── Dominios Aceptados ── */}
      <div className="settings-section">
        <div className="section-card">
          <h3 className="section-card-title">🌐 Dominios Aceptados</h3>
          <p className="section-card-subtitle">
            Solo los correos con estos dominios podrán enviar solicitudes de licencia.
            Si la lista está vacía se aceptarán todos los dominios.
          </p>

          {/* Current list */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {getCurrentDomains().map((domain) => (
              <span
                key={domain}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  backgroundColor: '#e8f5e9',
                  border: '1px solid #b2dfdb',
                  borderRadius: '16px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  fontFamily: 'monospace',
                }}
              >
                @{domain}
                <button
                  type="button"
                  onClick={() => handleRemoveDomain(domain)}
                  disabled={savingDomains}
                  title="Eliminar"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#721c24',
                    padding: '0',
                    lineHeight: 1,
                    fontSize: '1rem',
                  }}
                >
                  ×
                </button>
              </span>
            ))}
            {getCurrentDomains().length === 0 && (
              <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                No hay dominios configurados — se aceptarán todos.
              </span>
            )}
          </div>

          {/* Add new domain */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDomain(); } }}
              placeholder="empresa.com"
              disabled={savingDomains}
              className="setting-input"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={handleAddDomain}
              disabled={savingDomains || !newDomain.trim()}
            >
              {savingDomains ? '💾 Guardando...' : '+ Añadir'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Áreas / Departamentos ── */}
      <div className="settings-section">
        <div className="section-card">
          <h3 className="section-card-title">🏢 Áreas / Departamentos</h3>
          <p className="section-card-subtitle">
            Administra la lista de áreas disponibles en el formulario de solicitud de licencia
          </p>

          {/* Current list */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {getCurrentAreas().map((area) => (
              <span
                key={area}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  backgroundColor: '#e8f0fe',
                  border: '1px solid #c5d5f5',
                  borderRadius: '16px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}
              >
                {area}
                <button
                  type="button"
                  onClick={() => handleRemoveArea(area)}
                  disabled={savingAreas}
                  title="Eliminar"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#721c24',
                    padding: '0',
                    lineHeight: 1,
                    fontSize: '1rem',
                  }}
                >
                  ×
                </button>
              </span>
            ))}
            {getCurrentAreas().length === 0 && (
              <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                No hay áreas configuradas.
              </span>
            )}
          </div>

          {/* Add new area */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddArea(); } }}
              placeholder="Nueva área o departamento..."
              disabled={savingAreas}
              className="setting-input"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={handleAddArea}
              disabled={savingAreas || !newArea.trim()}
            >
              {savingAreas ? '💾 Guardando...' : '+ Añadir'}
            </button>
          </div>
        </div>
      </div>

      <div className="settings-info">
        <h3>ℹ️ Información sobre la Rotación Automática</h3>
        <div className="info-box">
          <p>
            <strong>¿Qué hace la rotación automática?</strong><br />
            Cuando una licencia expira, el sistema automáticamente cambia la contraseña 
            de Zoom para esa cuenta, asegurando que los usuarios no puedan seguir 
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
