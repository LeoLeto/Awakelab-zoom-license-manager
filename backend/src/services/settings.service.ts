import { Settings, ISettings } from '../models/Settings.model';
import { HistoryService } from './history.service';

export class SettingsService {
  /**
   * Get a setting by key
   */
  async getSetting(key: string): Promise<any> {
    const setting = await Settings.findOne({ key });
    return setting ? setting.value : null;
  }

  /**
   * Get all settings
   */
  async getAllSettings(): Promise<ISettings[]> {
    return await Settings.find().sort({ key: 1 });
  }

  /**
   * Set a setting (create or update)
   */
  async setSetting(key: string, value: any, description: string = '', actor: string = 'system'): Promise<ISettings> {
    const existingSetting = await Settings.findOne({ key });
    
    if (existingSetting) {
      // Record history before update
      const oldValue = existingSetting.value;
      
      existingSetting.value = value;
      existingSetting.description = description;
      existingSetting.updatedBy = actor;
      await existingSetting.save();

      // Record history
      await HistoryService.recordChange({
        entityType: 'setting',
        entityId: existingSetting._id.toString(),
        action: 'update',
        changes: [
          {
            field: 'value',
            oldValue: oldValue,
            newValue: value
          }
        ],
        actor
      });

      return existingSetting;
    } else {
      // Create new setting
      const newSetting = new Settings({
        key,
        value,
        description,
        updatedBy: actor
      });
      await newSetting.save();

      // Record history
      await HistoryService.recordChange({
        entityType: 'setting',
        entityId: newSetting._id.toString(),
        action: 'create',
        changes: [
          {
            field: 'value',
            newValue: value
          }
        ],
        actor
      });

      return newSetting;
    }
  }

  /**
   * Delete a setting
   */
  async deleteSetting(key: string, actor: string = 'system'): Promise<boolean> {
    const setting = await Settings.findOne({ key });
    if (!setting) {
      return false;
    }

    // Record history before deletion
    await HistoryService.recordChange({
      entityType: 'setting',
      entityId: setting._id.toString(),
      action: 'delete',
      changes: [
        {
          field: 'value',
          oldValue: setting.value
        }
      ],
      actor
    });

    await Settings.deleteOne({ key });
    return true;
  }

  /**
   * Initialize default settings
   */
  async initializeDefaults(): Promise<void> {
    const defaults = [
      {
        key: 'autoPasswordRotation',
        value: false,
        description: 'Cambiar contraseñas automáticamente cuando expiren las licencias'
      },
      {
        key: 'passwordRotationTime',
        value: '01:00',
        description: 'Hora del día para ejecutar la rotación (formato HH:MM)'
      },
      {
        key: 'notifyOnExpiration',
        value: true,
        description: 'Enviar notificaciones por correo antes de la expiración'
      },
      {
        key: 'expirationWarningDays',
        value: 2,
        description: 'Días antes de la expiración para enviar notificación de aviso'
      },
      {
        key: 'emailHost',
        value: '',
        description: 'Servidor SMTP para envío de correos (ej: smtp.gmail.com)'
      },
      {
        key: 'emailPort',
        value: '587',
        description: 'Puerto del servidor SMTP (587 para TLS, 465 para SSL)'
      },
      {
        key: 'emailSecure',
        value: false,
        description: 'Usar SSL/TLS para conexión SMTP'
      },
      {
        key: 'emailUser',
        value: '',
        description: 'Usuario de autenticación SMTP'
      },
      {
        key: 'emailPassword',
        value: '',
        description: 'Contraseña de autenticación SMTP'
      },
      {
        key: 'emailFrom',
        value: 'Sistema de Licencias Zoom <noreply@awakelab.cl>',
        description: 'Dirección de correo remitente'
      },
      {
        key: 'adminNotificationEmails',
        value: '',
        description: 'Correos de administradores (separados por comas)'
      },
      {
        key: 'notifyOnPasswordChange',
        value: false,
        description: 'Notificar administradores cuando se cambian contraseñas'
      },
      {
        key: 'notifyOnNewRequest',
        value: true,
        description: 'Notificar administradores de nuevas solicitudes pendientes'
      }
    ];

    for (const setting of defaults) {
      const exists = await Settings.findOne({ key: setting.key });
      if (!exists) {
        await this.setSetting(setting.key, setting.value, setting.description, 'system');
      }
    }

    console.log('✅ Default settings initialized');
  }

  /**
   * Check if auto password rotation is enabled
   */
  async isAutoPasswordRotationEnabled(): Promise<boolean> {
    const value = await this.getSetting('autoPasswordRotation');
    return value === true;
  }
}

export const settingsService = new SettingsService();
