import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin.model';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = express.Router();

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
      return;
    }

    // Find admin by username (case-insensitive)
    const admin = await Admin.findOne({ username: username.toLowerCase() });
    if (!admin) {
      res.status(401).json({ error: 'Usuario o contraseña inválidos' });
      return;
    }

    // Check password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Usuario o contraseña inválidos' });
      return;
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const token = jwt.sign(
      { adminId: admin._id.toString(), username: admin.username },
      jwtSecret,
      { expiresIn: '14d' }
    );

    res.json({
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        lastLogin: admin.lastLogin,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error interno del servidor', message: error.message });
  }
});

// Get current admin (verify token)
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const admin = await Admin.findById(req.adminId).select('-password');
    if (!admin) {
      res.status(404).json({ error: 'Administrador no encontrado' });
      return;
    }

    res.json({
      id: admin._id,
      username: admin.username,
      createdAt: admin.createdAt,
      lastLogin: admin.lastLogin,
    });
  } catch (error: any) {
    console.error('Get current admin error:', error);
    res.status(500).json({ error: 'Error interno del servidor', message: error.message });
  }
});

// Logout (client-side token removal, but endpoint for tracking)
router.post('/logout', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({ message: 'Sesión cerrada exitosamente' });
});

export default router;
