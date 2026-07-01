import type { User } from '@prisma/client';

/**
 * Extend Express Request to carry authenticated user data.
 */
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
