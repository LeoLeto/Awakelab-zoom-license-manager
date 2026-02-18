import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  adminId?: string;
  username?: string;
}

export interface JWTPayload {
  adminId: string;
  username: string;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
    return;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    req.adminId = decoded.adminId;
    req.username = decoded.username;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Token inválido o expirado.' });
    return;
  }
};
