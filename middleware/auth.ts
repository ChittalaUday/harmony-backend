// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ message: 'Authentication token is required' });
    return;
  }

  const token = authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  // Check if JWT_SECRET is available
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';

  if (!process.env.JWT_SECRET) {
    console.warn('⚠️ JWT_SECRET not found in environment variables. Using fallback key for development.');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};