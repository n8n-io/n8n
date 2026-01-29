import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
    });
  }

  try {
    const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as {
      userId: string;
      email: string;
      type: string;
    };

    if (payload.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type',
      });
    }

    req.user = {
      userId: payload.userId,
      email: payload.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
};

// Optional auth - doesn't fail if no token, but attaches user if valid
export const optionalAuth = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (token) {
    try {
      const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as {
        userId: string;
        email: string;
        type: string;
      };

      if (payload.type === 'access') {
        req.user = {
          userId: payload.userId,
          email: payload.email,
        };
      }
    } catch {
      // Token invalid, but that's okay for optional auth
    }
  }

  next();
};
