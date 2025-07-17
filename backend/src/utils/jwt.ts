import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required. Please set a strong, randomly generated secret.');
}

const jwtSecret: string = JWT_SECRET;

export interface JWTPayload {
  id: number;
  email: string;
  username: string;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, jwtSecret, { expiresIn: '30d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, jwtSecret);
    if (typeof decoded === 'object' && decoded !== null && 'id' in decoded && 'email' in decoded && 'username' in decoded) {
      return decoded as JWTPayload;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = verifyToken(token);
  
  if (!payload) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  req.user = payload;
  next();
}