import { Router, Response } from 'express';
import { settingsService } from '../services/settings.service';
import { emailService } from '../services/email.service';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Settings that unauthenticated users (e.g. the public request form) may read.
const PUBLIC_SETTINGS = new Set(['acceptedDomains', 'areaDepartamento']);

/**
 * Get all settings
 * GET /api/settings
 * Requires authentication (exposes sensitive values like email credentials).
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
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
 * Public for whitelisted keys (acceptedDomains, areaDepartamento).
 * Requires authentication for all other keys.
 */
router.get('/:key', (req: AuthRequest, res: Response, next) => {
  if (PUBLIC_SETTINGS.has(req.params.key)) return next();
  authenticateToken(req, res, next);
}, async (req: AuthRequest, res: Response) => {
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
router.put('/:key', authenticateToken, async (req: AuthRequest, res: Response) => {
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
router.delete('/:key', authenticateToken, async (req: AuthRequest, res: Response) => {
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
router.post('/test-email', authenticateToken, async (req: AuthRequest, res: Response) => {
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
 * Send a sample assignment confirmation email (for preview/testing)
 * POST /api/settings/test-assignment-email
 * Body: { recipientEmail: string }
 */
router.post('/test-assignment-email', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { recipientEmail } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        error: 'El email del destinatario es requerido'
      });
    }

    await emailService.sendAssignmentSample(recipientEmail);

    res.json({
      success: true,
      message: `Correo de muestra (asignación) enviado a ${recipientEmail}`
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
router.post('/initialize', authenticateToken, async (req: AuthRequest, res: Response) => {
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
