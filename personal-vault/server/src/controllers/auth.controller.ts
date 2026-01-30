import { Request, Response } from 'express';
import argon2 from 'argon2';
import { prisma } from '../utils/db.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
} from '../utils/jwt.js';
import {
  registerSchema,
  loginSchema,
  saltRequestSchema,
  refreshTokenSchema,
  validateBody,
} from '../utils/validation.js';
import { sanitizeForLogging } from '../middleware/security.js';

// Argon2 options for server-side hashing
const argon2Options: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
};

export async function register(req: Request, res: Response) {
  const validation = validateBody(registerSchema)(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error,
    });
  }

  const { email, authHash, salt, encryptedRecoveryBlob } = validation.data;

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered',
      });
    }

    // Hash the authHash with Argon2id for storage
    const storedHash = await argon2.hash(authHash, argon2Options);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        authHash: storedHash,
        salt,
        encryptedRecoveryBlob,
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    // Store refresh token hash
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    // Log registration (without sensitive data)
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'register',
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        success: true,
      },
    });

    console.log('User registered:', sanitizeForLogging({ email: user.email, id: user.id }));

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Registration failed',
    });
  }
}

export async function getSalt(req: Request, res: Response) {
  const validation = validateBody(saltRequestSchema)(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error,
    });
  }

  const { email } = validation.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { salt: true },
    });

    // Always return a response (even if user doesn't exist)
    // to prevent user enumeration attacks
    if (!user) {
      // Return a fake salt that looks valid
      // The login will fail anyway, but attacker can't know if email exists
      return res.json({
        success: true,
        data: {
          salt: 'AAAAAAAAAAAAAAAAAAAAAA==', // Fake 16-byte base64 salt
        },
      });
    }

    return res.json({
      success: true,
      data: {
        salt: user.salt,
      },
    });
  } catch (error) {
    console.error('Get salt error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get salt',
    });
  }
}

export async function login(req: Request, res: Response) {
  const validation = validateBody(loginSchema)(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error,
    });
  }

  const { email, authHash } = validation.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Log failed attempt
      await prisma.auditLog.create({
        data: {
          action: 'login',
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent'] || null,
          success: false,
          metadata: JSON.stringify({ reason: 'user_not_found' }),
        },
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Verify authHash against stored hash
    const isValid = await argon2.verify(user.authHash, authHash);

    if (!isValid) {
      // Log failed attempt
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'login',
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent'] || null,
          success: false,
          metadata: JSON.stringify({ reason: 'invalid_password' }),
        },
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    // Store refresh token hash
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    // Log successful login
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'login',
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        success: true,
      },
    });

    console.log('User logged in:', sanitizeForLogging({ email: user.email, id: user.id }));

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
}

export async function refreshToken(req: Request, res: Response) {
  const validation = validateBody(refreshTokenSchema)(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error,
    });
  }

  const { refreshToken: token } = validation.data;

  try {
    // Verify JWT
    const payload = verifyRefreshToken(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
      });
    }

    // Check if token exists and not revoked
    const tokenHash = hashToken(token);
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token not found or revoked',
      });
    }

    // Revoke old token (token rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens
    const newAccessToken = generateAccessToken(storedToken.user.id, storedToken.user.email);
    const newRefreshToken = generateRefreshToken(storedToken.user.id, storedToken.user.email);

    // Store new refresh token
    await prisma.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        tokenHash: hashToken(newRefreshToken),
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    return res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({
      success: false,
      error: 'Token refresh failed',
    });
  }
}

export async function logout(req: Request, res: Response) {
  const validation = validateBody(refreshTokenSchema)(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error,
    });
  }

  const { refreshToken: token } = validation.data;

  try {
    const tokenHash = hashToken(token);

    // Revoke the token
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });

    return res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
}

export async function getRecoveryBlob(req: Request, res: Response) {
  const validation = validateBody(saltRequestSchema)(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error,
    });
  }

  const { email } = validation.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { encryptedRecoveryBlob: true },
    });

    if (!user || !user.encryptedRecoveryBlob) {
      return res.status(404).json({
        success: false,
        error: 'Recovery not available',
      });
    }

    return res.json({
      success: true,
      data: {
        encryptedRecoveryBlob: user.encryptedRecoveryBlob,
      },
    });
  } catch (error) {
    console.error('Get recovery blob error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get recovery data',
    });
  }
}
