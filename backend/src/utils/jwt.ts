import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { ApiResponseUtil, ErrorType, ErrorCode } from './response';

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
    ApiResponseUtil.error(res, 401, ErrorType.AUTHENTICATION_ERROR, ErrorCode.INVALID_TOKEN, 'No token provided');
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = verifyToken(token);
  
  if (!payload) {
    ApiResponseUtil.error(res, 401, ErrorType.AUTHENTICATION_ERROR, ErrorCode.INVALID_TOKEN, 'Invalid token');
    return;
  }

  req.user = payload;
  next();
}