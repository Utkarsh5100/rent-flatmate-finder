import type { UserRole } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';


import { ForbiddenError, UnauthorizedError } from '../errors/index.js';

/**
 * Role-based authorization middleware factory.
 * Must be used AFTER the authenticate middleware.
 *
 * Usage: requireRole('OWNER', 'ADMIN')
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError(`Access denied. Required role: ${roles.join(' or ')}`));
      return;
    }

    next();
  };
}
