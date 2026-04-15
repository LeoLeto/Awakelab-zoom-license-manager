import { Router, Request, Response } from 'express';
import { EmailLog } from '../models/EmailLog.model';
import { emailService } from '../services/email.service';
import { settingsService } from '../services/settings.service';

const router = Router();

/**
 * GET /api/email-logs
 * List email logs with optional filters.
 * Query params: limit, status, logType
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const { status, logType } = req.query;

    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (logType) filter.logType = logType;

    const logs = await EmailLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/email-logs/:id/resend
 * Resend an email to its original recipients.
 */
router.post('/:id/resend', async (req: Request, res: Response) => {
  try {
    const sent = await emailService.resendEmail(req.params.id);
    res.json({ success: sent });
  } catch (error: any) {
    const status = error.message === 'Entrada de log no encontrada' ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/email-logs/:id/resend-admins
 * Resend an email to all configured admin notification addresses.
 */
router.post('/:id/resend-admins', async (req: Request, res: Response) => {
  try {
    const adminEmailsSetting = await settingsService.getSetting('adminNotificationEmails');

    let emails: string[] = [];
    if (Array.isArray(adminEmailsSetting)) {
      emails = adminEmailsSetting.map((e: string) => e.trim()).filter(Boolean);
    } else if (typeof adminEmailsSetting === 'string' && adminEmailsSetting.trim()) {
      emails = adminEmailsSetting.split(',').map((e: string) => e.trim()).filter(Boolean);
    }

    if (emails.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No hay emails de administrador configurados',
      });
    }

    const sent = await emailService.resendEmail(req.params.id, emails);
    res.json({ success: sent });
  } catch (error: any) {
    const status = error.message === 'Entrada de log no encontrada' ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

export default router;
