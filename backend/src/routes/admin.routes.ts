import express, { Request, Response } from 'express';
import { Admin } from '../models/Admin.model';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = express.Router();

// All admin routes require authentication
router.use(authenticateToken);

// Get all admins
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const admins = await Admin.find()
      .select('-password')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    res.json(admins);
  } catch (error: any) {
    console.error('Get admins error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Create new admin (only authenticated admins can create other admins)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    if (username.length < 3) {
      res.status(400).json({ error: 'Username must be at least 3 characters long' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    // Check if username already exists (case-insensitive)
    const existingAdmin = await Admin.findOne({ username: username.toLowerCase() });
    if (existingAdmin) {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }

    // Create new admin
    const newAdmin = new Admin({
      username,
      password,
      createdBy: req.adminId,
    });

    await newAdmin.save();

    res.status(201).json({
      message: 'Admin created successfully',
      admin: {
        id: newAdmin._id,
        username: newAdmin.username,
        createdAt: newAdmin.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Delete an admin
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (id === req.adminId) {
      res.status(400).json({ error: 'You cannot delete your own account' });
      return;
    }

    // Check if trying to delete superadmin
    const adminToDelete = await Admin.findById(id);
    if (!adminToDelete) {
      res.status(404).json({ error: 'Admin not found' });
      return;
    }

    if (adminToDelete.username === 'superadmin') {
      res.status(403).json({ error: 'Cannot delete the Superadmin account' });
      return;
    }

    await Admin.findByIdAndDelete(id);

    res.json({ message: 'Admin deleted successfully' });
  } catch (error: any) {
    console.error('Delete admin error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Change password
router.put('/change-password', async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long' });
      return;
    }

    const admin = await Admin.findById(req.adminId);
    if (!admin) {
      res.status(404).json({ error: 'Admin not found' });
      return;
    }

    // Verify current password
    const isPasswordValid = await admin.comparePassword(currentPassword);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

export default router;
