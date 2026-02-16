import { Router, Request, Response } from 'express';
import { HistoryService } from '../services/history.service';
import { Types } from 'mongoose';

const router = Router();

/**
 * GET /api/history/recent
 * Get recent history across all entities
 */
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const entityType = req.query.entityType as 'license' | 'assignment' | undefined;
    const action = req.query.action as string | undefined;
    const actor = req.query.actor as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const history = await HistoryService.getRecentHistory(limit, {
      entityType,
      action,
      actor,
      startDate,
      endDate,
    });

    res.json(history);
  } catch (error) {
    console.error('Error fetching recent history:', error);
    res.status(500).json({ error: 'Failed to fetch recent history' });
  }
});

/**
 * GET /api/history/license/:licenseId
 * Get history for a specific license
 */
router.get('/license/:licenseId', async (req: Request, res: Response) => {
  try {
    const { licenseId } = req.params;
    
    if (!Types.ObjectId.isValid(licenseId)) {
      return res.status(400).json({ error: 'Invalid license ID' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const full = req.query.full === 'true';

    const history = full
      ? await HistoryService.getLicenseFullHistory(licenseId, limit)
      : await HistoryService.getEntityHistory('license', licenseId, limit);

    res.json(history);
  } catch (error) {
    console.error('Error fetching license history:', error);
    res.status(500).json({ error: 'Failed to fetch license history' });
  }
});

/**
 * GET /api/history/assignment/:assignmentId
 * Get history for a specific assignment
 */
router.get('/assignment/:assignmentId', async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    
    if (!Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ error: 'Invalid assignment ID' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const history = await HistoryService.getEntityHistory('assignment', assignmentId, limit);

    res.json(history);
  } catch (error) {
    console.error('Error fetching assignment history:', error);
    res.status(500).json({ error: 'Failed to fetch assignment history' });
  }
});

/**
 * DELETE /api/history/cleanup
 * Clean up old history entries
 */
router.delete('/cleanup', async (req: Request, res: Response) => {
  try {
    const daysToKeep = parseInt(req.query.daysToKeep as string) || 365;
    const deletedCount = await HistoryService.cleanupOldHistory(daysToKeep);

    res.json({ 
      message: `Cleaned up ${deletedCount} old history entries`,
      deletedCount 
    });
  } catch (error) {
    console.error('Error cleaning up history:', error);
    res.status(500).json({ error: 'Failed to clean up history' });
  }
});

export default router;
