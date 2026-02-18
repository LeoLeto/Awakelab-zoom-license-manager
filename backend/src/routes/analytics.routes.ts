import { Router, Request, Response } from 'express';
import analyticsService from '../services/analytics.service';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

/**
 * GET /api/analytics/overview
 * Obtiene estadísticas generales del sistema
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const stats = await analyticsService.getOverviewStats();
    res.json(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas generales:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas generales',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * GET /api/analytics/licenses
 * Obtiene métricas por licencia
 * Query params: limit (opcional, default: 10)
 */
router.get('/licenses', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const metrics = await analyticsService.getLicenseMetrics(limit);
    res.json(metrics);
  } catch (error) {
    console.error('Error al obtener métricas de licencias:', error);
    res.status(500).json({ 
      error: 'Error al obtener métricas de licencias',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * GET /api/analytics/teachers
 * Obtiene métricas por profesor
 * Query params: limit (opcional, default: 10)
 */
router.get('/teachers', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const metrics = await analyticsService.getTeacherMetrics(limit);
    res.json(metrics);
  } catch (error) {
    console.error('Error al obtener métricas de profesores:', error);
    res.status(500).json({ 
      error: 'Error al obtener métricas de profesores',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * GET /api/analytics/trends
 * Obtiene tendencias de los últimos N días
 * Query params: days (opcional, default: 30)
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const trends = await analyticsService.getTrends(days);
    res.json(trends);
  } catch (error) {
    console.error('Error al obtener tendencias:', error);
    res.status(500).json({ 
      error: 'Error al obtener tendencias',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * GET /api/analytics/history
 * Obtiene métricas de actividad histórica
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const metrics = await analyticsService.getHistoryMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error al obtener métricas del historial:', error);
    res.status(500).json({ 
      error: 'Error al obtener métricas del historial',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;
