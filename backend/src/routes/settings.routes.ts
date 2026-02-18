import { Router, Response } from 'express';
import { settingsService } from '../services/settings.service';
import { emailService } from '../services/email.service';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// All settings routes require authentication
router.use(authenticateToken);

/**
 * Get all settings
 * GET /api/settings
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const settings = await settingsService.getAllSettings();
    res.json({
      success: true,
      settings
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get a specific setting by key
 * GET /api/settings/:key
 */
router.get('/:key', async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;
    const value = await settingsService.getSetting(key);
    
    if (value === null) {
      return res.status(404).json({
        success: false,
        error: 'Configuración no encontrada'
      });
    }

    res.json({
      success: true,
      key,
      value
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Set a setting (create or update)
 * PUT /api/settings/:key
 * Body: { value: any, description?: string }
 */
router.put('/:key', async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    const actor = req.username || 'admin';

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'El valor es requerido'
      });
    }

    const setting = await settingsService.setSetting(key, value, description, actor);
    
    res.json({
      success: true,
      setting
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Delete a setting
 * DELETE /api/settings/:key
 */
router.delete('/:key', async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;
    const actor = req.username || 'admin';
    
    const deleted = await settingsService.deleteSetting(key, actor);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Configuración no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Configuración eliminada exitosamente'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test email configuration
 * POST /api/settings/test-email
 * Body: { recipientEmail: string }
 */
router.post('/test-email', async (req: AuthRequest, res: Response) => {
  try {
    const { recipientEmail } = req.body;
    
    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        error: 'El email del destinatario es requerido'
      });
    }

    const sent = await emailService.sendTestEmail(recipientEmail);
    
    if (!sent) {
      return res.status(500).json({
        success: false,
        error: 'Error al enviar correo de prueba. Verifica tu configuración de email.'
      });
    }

    res.json({
      success: true,
      message: `Correo de prueba enviado a ${recipientEmail}`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Initialize default settings
 * POST /api/settings/initialize
 */
router.post('/initialize', async (req: AuthRequest, res: Response) => {
  try {
    await settingsService.initializeDefaults();
    res.json({
      success: true,
      message: 'Default settings initialized'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
