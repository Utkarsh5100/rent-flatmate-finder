import type { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '../errors/index.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

/**
 * Auth middleware — verifies JWT access token from the Authorization header,
 * fetches the user from DB, checks isActive, and attaches to req.user.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7); // Remove "Bearer "

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired access token');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account has been deactivated');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
