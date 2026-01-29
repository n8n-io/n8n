import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/index.js';

interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

export const generateAccessToken = (userId: string, email: string): string => {
  const payload: TokenPayload = {
    userId,
    email,
    type: 'access',
  };

  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRATION,
  });
};

export const generateRefreshToken = (userId: string, email: string): string => {
  const payload: TokenPayload = {
    userId,
    email,
    type: 'refresh',
  };

  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRATION,
  });
};

export const verifyRefreshToken = (token: string): TokenPayload | null => {
  try {
    const payload = jwt.verify(token, config.JWT_REFRESH_SECRET) as TokenPayload;

    if (payload.type !== 'refresh') {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Parse expiration string to milliseconds
export const parseExpirationToMs = (expiration: string): number => {
  const units: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const match = expiration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid expiration format: ${expiration}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  return value * units[unit];
};

export const getRefreshTokenExpiry = (): Date => {
  const ms = parseExpirationToMs(config.JWT_REFRESH_EXPIRATION);
  return new Date(Date.now() + ms);
};
