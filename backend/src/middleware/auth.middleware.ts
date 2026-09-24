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

/**
 * Identifies the admin when a valid token is present, but never rejects the
 * request. Used on routes shared by the public teacher portal and the admin
 * panel so the response can depend on who is asking.
 */
export const optionalAuth = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  const token = req.headers['authorization']?.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET;

  if (token && jwtSecret) {
    try {
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      req.adminId = decoded.adminId;
      req.username = decoded.username;
    } catch {
      // Invalid or expired token: treat as anonymous
    }
  }
  next();
};

const LICENSE_SECRET_FIELDS = new Set([
  'passwordZoom',
  'passwordEmail',
  'claveAnfitrionZoom',
  'claveUsuarioMoodle',
]);

function stripSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSecrets);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      if (!LICENSE_SECRET_FIELDS.has(key)) out[key] = stripSecrets(v);
    }
    return out;
  }
  return value;
}

/**
 * For anonymous requests, removes license credentials from every JSON
 * response (including licenses populated inside assignments). Admins
 * (valid token, see optionalAuth) still receive the full documents.
 */
export const hideLicenseSecretsFromPublic = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.adminId) {
    const json = res.json.bind(res);
    // Round-trip through JSON first so Mongoose documents become plain objects
    res.json = (body?: any) => json(stripSecrets(JSON.parse(JSON.stringify(body ?? null))));
  }
  next();
};
