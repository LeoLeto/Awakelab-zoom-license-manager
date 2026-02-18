import { Router, Request, Response } from 'express';
import zoomService from '../services/zoom.service';
import { PasswordChangeRequest } from '../types/zoom.types';

const router = Router();

/**
 * Test Zoom API connection
 * GET /api/zoom/test
 */
router.get('/test', async (req: Request, res: Response) => {
  try {
    const isConnected = await zoomService.testConnection();
    res.json({ 
      success: isConnected,
      message: isConnected ? 'API de Zoom conectada exitosamente' : 'Error al conectar con la API de Zoom'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Get all Zoom users
 * GET /api/zoom/users
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await zoomService.getAllUsers();
    res.json({ 
      success: true,
      count: users.length,
      users 
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Get specific Zoom user
 * GET /api/zoom/users/:userIdOrEmail
 */
router.get('/users/:userIdOrEmail', async (req: Request, res: Response) => {
  try {
    const { userIdOrEmail } = req.params;
    const user = await zoomService.getUser(userIdOrEmail);
    res.json({ 
      success: true,
      user 
    });
  } catch (error: any) {
    res.status(404).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * 🔑 Change Zoom user password
 * POST /api/zoom/change-password
 * Body: { userEmail: string, newPassword?: string }
 */
router.post('/change-password', async (req: Request, res: Response) => {
  try {
    const { userEmail, newPassword }: PasswordChangeRequest = req.body;

    if (!userEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'El email del usuario es requerido' 
      });
    }

    // Generate password if not provided
    const passwordToUse = newPassword || zoomService.generateSecurePassword();

    // Change the password
    await zoomService.changeUserPassword(userEmail, passwordToUse);

    res.json({ 
      success: true,
      email: userEmail,
      newPassword: passwordToUse,
      message: 'Contraseña cambiada exitosamente'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * 🔑 Generate a secure password
 * GET /api/zoom/generate-password
 */
router.get('/generate-password', (req: Request, res: Response) => {
  const length = parseInt(req.query.length as string) || 12;
  const password = zoomService.generateSecurePassword(length);
  
  res.json({ 
    success: true,
    password 
  });
});

/**
 * 🔑 Bulk change passwords for multiple users
 * POST /api/zoom/bulk-change-password
 * Body: { userEmails: string[] }
 */
router.post('/bulk-change-password', async (req: Request, res: Response) => {
  try {
    const { userEmails } = req.body;

    if (!Array.isArray(userEmails) || userEmails.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'El array de emails de usuarios es requerido' 
      });
    }

    const results = await zoomService.bulkChangePasswords(userEmails);

    res.json({ 
      success: true,
      results,
      summary: {
        total: userEmails.length,
        successful: results.success.length,
        failed: results.failed.length
      }
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;
