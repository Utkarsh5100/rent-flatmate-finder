import type { UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import { Router } from 'express';


import { ConflictError, UnauthorizedError } from '../errors/index.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import {
  loginSchema,
  refreshSchema,
  registerSchema,
} from '../validators/auth.validators.js';

const authRouter = Router();

const BCRYPT_SALT_ROUNDS = 12;

/** Strip sensitive fields from user object for API responses. */
function sanitizeUser(user: { id: string; email: string; firstName: string; lastName: string; role: UserRole; avatarUrl: string | null }) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    avatarUrl: user.avatarUrl,
  };
}

// ── POST /auth/register ──────────────────────────────────────────────────────

authRouter.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  async (req, res, next) => {
    try {
      const { email, password, firstName, lastName, role, phone } = req.body as {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        role: 'TENANT' | 'OWNER';
        phone?: string;
      };

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new ConflictError('A user with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          hashedPassword,
          firstName,
          lastName,
          role,
          phone,
        },
      });

      // Generate tokens
      const tokenPayload = { userId: user.id, role: user.role };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      res.status(201).json({
        status: 'success',
        data: {
          accessToken,
          refreshToken,
          user: sanitizeUser(user),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /auth/login ─────────────────────────────────────────────────────────

authRouter.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  async (req, res, next) => {
    try {
      const { email, password } = req.body as { email: string; password: string };

      // Find user by email
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Check if account is active
      if (!user.isActive) {
        throw new UnauthorizedError('Account has been deactivated');
      }

      // Compare password
      const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
      if (!passwordMatch) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Generate tokens
      const tokenPayload = { userId: user.id, role: user.role };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      res.status(200).json({
        status: 'success',
        data: {
          accessToken,
          refreshToken,
          user: sanitizeUser(user),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /auth/refresh ───────────────────────────────────────────────────────

authRouter.post(
  '/refresh',
  authLimiter,
  validate(refreshSchema),
  async (req, res, next) => {
    try {
      const { refreshToken: token } = req.body as { refreshToken: string };

      // Verify refresh token
      let payload;
      try {
        payload = verifyRefreshToken(token);
      } catch {
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      // Find user
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('Account has been deactivated');
      }

      // Rotate tokens
      const newPayload = { userId: user.id, role: user.role };
      const accessToken = generateAccessToken(newPayload);
      const refreshToken = generateRefreshToken(newPayload);

      res.status(200).json({
        status: 'success',
        data: {
          accessToken,
          refreshToken,
          user: sanitizeUser(user),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /auth/logout ────────────────────────────────────────────────────────

authRouter.post('/logout', (_req, res) => {
  // Stateless JWT — client discards tokens.
  // In a production system with token blacklisting, you'd invalidate here.
  res.status(200).json({
    status: 'success',
    data: { message: 'Logged out successfully' },
  });
});

// ── GET /auth/me ─────────────────────────────────────────────────────────────

authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        tenantProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hashedPassword, ...userData } = user;

    res.status(200).json({
      status: 'success',
      data: { user: userData },
    });
  } catch (err) {
    next(err);
  }
});

export { authRouter };
