import type { Request } from 'express';
import { Router } from 'express';

import { ForbiddenError, NotFoundError } from '../errors/index.js';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const adminRouter = Router();

function param(req: Request, key: string): string {
  return req.params[key] as string;
}

// Ensure all routes under /admin are authenticated and require ADMIN role
adminRouter.use(authenticate, requireRole('ADMIN'));

// ── GET /admin/stats — Basic platform statistics ─────────────────────────────
adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const [totalUsers, totalListings, totalAcceptedMatches, totalChats] = await Promise.all([
      prisma.user.count(),
      prisma.listing.count(),
      prisma.interestRequest.count({ where: { status: 'ACCEPTED' } }),
      prisma.conversation.count(),
    ]);

    // Group users by role
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: true,
    });

    // Group listings by status
    const listingsByStatus = await prisma.listing.groupBy({
      by: ['status'],
      _count: true,
    });

    res.json({
      status: 'success',
      data: {
        stats: {
          totalUsers,
          totalListings,
          totalAcceptedMatches,
          totalChats,
        },
        usersByRole: usersByRole.map((u) => ({ role: u.role, count: u._count })),
        listingsByStatus: listingsByStatus.map((l) => ({ status: l.status, count: l._count })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /admin/users — List and search users with pagination ─────────────────
adminRouter.get('/users', async (req, res, next) => {
  try {
    const search = (req.query['search'] as string || '').trim();
    const page = Math.max(parseInt(req.query['page'] as string || '1', 10), 1);
    const limit = Math.max(1, Math.min(parseInt(req.query['limit'] as string || '20', 10), 100));

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      status: 'success',
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /admin/users/:id/toggle-active — Toggle activation ─────────────────
adminRouter.patch('/users/:id/toggle-active', async (req, res, next) => {
  try {
    const userId = param(req, 'id');

    if (userId === req.user!.id) {
      throw new ForbiddenError('You cannot deactivate your own admin account');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    res.json({
      status: 'success',
      data: { user: updatedUser },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /admin/listings — List and search listings with pagination ───────────
adminRouter.get('/listings', async (req, res, next) => {
  try {
    const search = (req.query['search'] as string || '').trim();
    const page = Math.max(parseInt(req.query['page'] as string || '1', 10), 1);
    const limit = Math.max(1, Math.min(parseInt(req.query['limit'] as string || '20', 10), 100));

    const where = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { location: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      status: 'success',
      data: {
        listings,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /admin/listings/:id — Delete any listing ──────────────────────────
adminRouter.delete('/listings/:id', async (req, res, next) => {
  try {
    const listingId = param(req, 'id');
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundError('Listing');

    await prisma.listing.delete({ where: { id: listingId } });

    res.json({
      status: 'success',
      data: { message: 'Listing removed successfully' },
    });
  } catch (err) {
    next(err);
  }
});

export { adminRouter };
