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
    res.status(500).json({ error: 'Error interno del servidor', message: error.message });
  }
});

// Create new admin (only authenticated admins can create other admins)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
      return;
    }

    if (username.length < 3) {
      res.status(400).json({ error: 'El nombre de usuario debe tener al menos 3 caracteres' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    // Check if username already exists (case-insensitive)
    const existingAdmin = await Admin.findOne({ username: username.toLowerCase() });
    if (existingAdmin) {
      res.status(409).json({ error: 'El nombre de usuario ya existe' });
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
      message: 'Administrador creado exitosamente',
      admin: {
        id: newAdmin._id,
        username: newAdmin.username,
        createdAt: newAdmin.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Error interno del servidor', message: error.message });
  }
});

// Delete an admin
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (id === req.adminId) {
      res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
      return;
    }

    // Check if trying to delete superadmin
    const adminToDelete = await Admin.findById(id);
    if (!adminToDelete) {
      res.status(404).json({ error: 'Administrador no encontrado' });
      return;
    }

    if (adminToDelete.username === 'superadmin') {
      res.status(403).json({ error: 'No se puede eliminar la cuenta de Superadmin' });
      return;
    }

    await Admin.findByIdAndDelete(id);

    res.json({ message: 'Administrador eliminado exitosamente' });
  } catch (error: any) {
    console.error('Delete admin error:', error);
    res.status(500).json({ error: 'Error interno del servidor', message: error.message });
  }
});

// Change password
router.put('/change-password', async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'La contraseña actual y la nueva contraseña son requeridas' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
      return;
    }

    const admin = await Admin.findById(req.adminId);
    if (!admin) {
      res.status(404).json({ error: 'Administrador no encontrado' });
      return;
    }

    // Verify current password
    const isPasswordValid = await admin.comparePassword(currentPassword);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'La contraseña actual es incorrecta' });
      return;
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    res.json({ message: 'Contraseña cambiada exitosamente' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Error interno del servidor', message: error.message });
  }
});

export default router;
