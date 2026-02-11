import { Router, Request, Response } from 'express';
import { licenseService } from '../services/license.service';
import { assignmentService } from '../services/assignment.service';

const router = Router();

/**
 * Get all licenses with their current assignments
 * GET /api/licenses
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const licenses = await licenseService.getAllLicensesWithAssignments();
    res.json({ 
      success: true,
      count: licenses.length,
      licenses
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Get available licenses for a date range
 * GET /api/licenses/available?startDate=2024-01-01&endDate=2024-01-31
 */
router.get('/available', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    const availableLicenses = await licenseService.getAvailableLicenses(start, end);
    res.json({ 
      success: true,
      count: availableLicenses.length,
      availableLicenses
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Get license by ID
 * GET /api/licenses/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const license = await licenseService.getLicenseWithAssignment(req.params.id);
    
    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'License not found'
      });
    }

    res.json({ 
      success: true,
      license
    });
  } catch (error: any) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Create a new license
 * POST /api/licenses
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const license = await licenseService.createLicense(req.body);
    res.status(201).json({ 
      success: true,
      message: 'License created successfully',
      license
    });
  } catch (error: any) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Update a license
 * PUT /api/licenses/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const license = await licenseService.updateLicense(req.params.id, req.body);
    
    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'License not found'
      });
    }

    res.json({ 
      success: true,
      message: 'License updated successfully',
      license
    });
  } catch (error: any) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Delete a license
 * DELETE /api/licenses/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await licenseService.deleteLicense(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'License not found'
      });
    }

    res.json({ 
      success: true,
      message: 'License deleted successfully'
    });
  } catch (error: any) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Create a new assignment (license request)
 * POST /api/licenses/assignments
 */
router.post('/assignments', async (req: Request, res: Response) => {
  try {
    const assignment = await assignmentService.createAssignment(req.body);
    res.status(201).json({ 
      success: true,
      message: 'Assignment created successfully',
      assignment
    });
  } catch (error: any) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Get all assignments
 * GET /api/licenses/assignments/all
 */
router.get('/assignments/all', async (req: Request, res: Response) => {
  try {
    const assignments = await assignmentService.getAllAssignments();
    res.json({ 
      success: true,
      count: assignments.length,
      assignments
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Get active assignments
 * GET /api/licenses/assignments/active
 */
router.get('/assignments/active', async (req: Request, res: Response) => {
  try {
    const assignments = await assignmentService.getActiveAssignments();
    res.json({ 
      success: true,
      count: assignments.length,
      assignments
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Cancel an assignment
 * POST /api/licenses/assignments/:id/cancel
 */
router.post('/assignments/:id/cancel', async (req: Request, res: Response) => {
  try {
    const assignment = await assignmentService.cancelAssignment(req.params.id);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    res.json({ 
      success: true,
      message: 'Assignment cancelled successfully',
      assignment
    });
  } catch (error: any) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;
