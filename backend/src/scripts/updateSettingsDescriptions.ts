// Run this script to update existing settings descriptions to Spanish
// Usage: cd backend && npx ts-node src/scripts/updateSettingsDescriptions.ts

import { db } from '../config/database';
import { settingsService } from '../services/settings.service';

const updateDescriptions = async () => {
  try {
    console.log('🔄 Updating settings descriptions to Spanish...\n');

    await db.connect();

    const updates = [
      {
        key: 'autoPasswordRotation',
        description: 'Cambiar contraseñas automáticamente cuando expiren las licencias'
      },
      {
        key: 'passwordRotationTime',
        description: 'Hora del día para ejecutar la rotación (formato HH:MM)'
      },
      {
        key: 'notifyOnExpiration',
        description: 'Enviar notificaciones por correo antes de la expiración'
      },
      {
        key: 'expirationWarningDays',
        description: 'Días antes de la expiración para enviar notificación de aviso'
      }
    ];

    for (const update of updates) {
      const currentValue = await settingsService.getSetting(update.key);
      if (currentValue !== null) {
        await settingsService.setSetting(
          update.key,
          currentValue,
          update.description,
          'system-update'
        );
        console.log(`✅ Updated: ${update.key}`);
      } else {
        console.log(`⚠️  Not found: ${update.key}`);
      }
    }

    console.log('\n✅ All settings descriptions updated to Spanish!');
    
    await db.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating settings:', error);
    process.exit(1);
  }
};

updateDescriptions();
