import type { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { Router } from 'express';

import { ForbiddenError, NotFoundError, ValidationError } from '../errors/index.js';
import { prisma } from '../lib/prisma.js';
import { upload } from '../lib/upload.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { batchGetScores } from '../services/compatibility.service.js';
import {
  createListingSchema,
  listingQuerySchema,
  updateListingSchema,
} from '../validators/listing.validators.js';

const listingRouter = Router();

/** Type-safe param access */
function param(req: Request, key: string): string {
  return req.params[key] as string;
}

// ── GET /listings — Browse with filters + pagination + optional scoring ──────
listingRouter.get('/', async (req, res, next) => {
  try {
    const q = listingQuerySchema.parse(req.query);
    const where: Prisma.ListingWhereInput = {};

    if (!q.includeFilled) where.status = 'ACTIVE';
    if (q.location) where.location = { contains: q.location, mode: 'insensitive' };
    if (q.minRent || q.maxRent) {
      where.rent = {};
      if (q.minRent) where.rent.gte = q.minRent;
      if (q.maxRent) where.rent.lte = q.maxRent;
    }
    if (q.roomType) where.roomType = q.roomType;
    if (q.furnishingStatus) where.furnishingStatus = q.furnishingStatus;

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: { photos: { orderBy: { order: 'asc' } }, owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.listing.count({ where }),
    ]);

    // If authenticated tenant with a profile, compute/fetch compatibility scores
    let scoredListings = listings.map(l => ({ ...l, compatibility: null as { score: number; explanation: string; computedVia: string } | null }));

    // Try to get tenant profile from auth header (optional — don't require auth)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { verifyAccessToken } = await import('../lib/jwt.js');
        const payload = verifyAccessToken(authHeader.slice(7));
        if (payload.role === 'TENANT') {
          const profile = await prisma.tenantProfile.findUnique({ where: { userId: payload.userId } });
          if (profile) {
            const scores = await batchGetScores(payload.userId, listings, profile);
            scoredListings = scoredListings.map(l => ({
              ...l,
              compatibility: scores.get(l.id) ?? null,
            }));
            // Sort by score descending
            scoredListings.sort((a, b) => (b.compatibility?.score ?? 0) - (a.compatibility?.score ?? 0));
          }
        }
      } catch {
        // Invalid/expired token — just return listings without scores
      }
    }

    res.json({
      status: 'success',
      data: {
        listings: scoredListings,
        pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
      },
    });
  } catch (err) { next(err); }
});

// ── GET /listings/mine — Owner's listings ────────────────────────────────────
listingRouter.get('/mine', authenticate, requireRole('OWNER'), async (req, res, next) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { ownerId: req.user!.id },
      include: { photos: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ status: 'success', data: { listings } });
  } catch (err) { next(err); }
});

// ── GET /listings/:id — Single listing ───────────────────────────────────────
listingRouter.get('/:id', async (req, res, next) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: param(req, 'id') },
      include: {
        photos: { orderBy: { order: 'asc' } },
        owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
    if (!listing) throw new NotFoundError('Listing');
    res.json({ status: 'success', data: { listing } });
  } catch (err) { next(err); }
});

// ── POST /listings — Create listing (OWNER) ─────────────────────────────────
listingRouter.post(
  '/',
  authenticate,
  requireRole('OWNER'),
  upload.array('photos', 5),
  validate(createListingSchema),
  async (req, res, next) => {
    try {
      const data = req.body as Record<string, unknown>;
      const files = req.files as Express.Multer.File[] | undefined;

      const listing = await prisma.listing.create({
        data: {
          ownerId: req.user!.id,
          title: data['title'] as string,
          description: data['description'] as string,
          location: data['location'] as string,
          address: (data['address'] as string) || null,
          rent: data['rent'] as number,
          deposit: (data['deposit'] as number) || null,
          availableFrom: data['availableFrom'] as Date,
          roomType: data['roomType'] as 'SINGLE' | 'DOUBLE' | 'SHARED' | 'STUDIO' | 'APARTMENT',
          furnishingStatus: data['furnishingStatus'] as 'FURNISHED' | 'SEMI_FURNISHED' | 'UNFURNISHED',
          amenities: data['amenities'] as string[],
          rules: data['rules'] as string[],
          maxOccupants: data['maxOccupants'] as number,
          photos: files?.length ? {
            create: files.map((f, i) => ({
              url: `/uploads/listings/${f.filename}`,
              order: i,
            })),
          } : undefined,
        },
        include: { photos: true },
      });

      res.status(201).json({ status: 'success', data: { listing } });
    } catch (err) { next(err); }
  },
);

// ── PUT /listings/:id — Update listing (OWNER, own only) ────────────────────
listingRouter.put(
  '/:id',
  authenticate,
  requireRole('OWNER'),
  upload.array('photos', 5),
  validate(updateListingSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.listing.findUnique({ where: { id: param(req, 'id') } });
      if (!existing) throw new NotFoundError('Listing');
      if (existing.ownerId !== req.user!.id) throw new ForbiddenError('You can only edit your own listings');

      const data = req.body as Record<string, unknown>;
      const files = req.files as Express.Multer.File[] | undefined;

      const updateData: Record<string, unknown> = {};
      const fields = ['title', 'description', 'location', 'address', 'rent', 'deposit', 'availableFrom', 'roomType', 'furnishingStatus', 'amenities', 'rules', 'maxOccupants'] as const;
      for (const f of fields) {
        if (data[f] !== undefined) updateData[f] = data[f];
      }

      // Add new photos if uploaded
      if (files?.length) {
        const maxOrder = await prisma.listingPhoto.aggregate({ where: { listingId: existing.id }, _max: { order: true } });
        const startOrder = (maxOrder._max.order ?? -1) + 1;
        await prisma.listingPhoto.createMany({
          data: files.map((f, i) => ({
            listingId: existing.id,
            url: `/uploads/listings/${f.filename}`,
            order: startOrder + i,
          })),
        });
      }

      const listing = await prisma.listing.update({
        where: { id: existing.id },
        data: updateData,
        include: { photos: { orderBy: { order: 'asc' } } },
      });

      res.json({ status: 'success', data: { listing } });
    } catch (err) { next(err); }
  },
);

// ── PATCH /listings/:id/status — Mark FILLED/ACTIVE (OWNER) ─────────────────
listingRouter.patch('/:id/status', authenticate, requireRole('OWNER'), async (req, res, next) => {
  try {
    const existing = await prisma.listing.findUnique({ where: { id: param(req, 'id') } });
    if (!existing) throw new NotFoundError('Listing');
    if (existing.ownerId !== req.user!.id) throw new ForbiddenError('You can only modify your own listings');

    const { status } = req.body as { status?: string };
    if (status !== 'ACTIVE' && status !== 'FILLED') throw new ValidationError('Status must be ACTIVE or FILLED');

    const listing = await prisma.listing.update({
      where: { id: existing.id },
      data: { status },
      include: { photos: true },
    });

    res.json({ status: 'success', data: { listing } });
  } catch (err) { next(err); }
});

// ── DELETE /listings/:id — Delete listing (OWNER, own only) ──────────────────
listingRouter.delete('/:id', authenticate, requireRole('OWNER'), async (req, res, next) => {
  try {
    const existing = await prisma.listing.findUnique({ where: { id: param(req, 'id') } });
    if (!existing) throw new NotFoundError('Listing');
    if (existing.ownerId !== req.user!.id) throw new ForbiddenError('You can only delete your own listings');

    await prisma.listing.delete({ where: { id: existing.id } });
    res.json({ status: 'success', data: { message: 'Listing deleted' } });
  } catch (err) { next(err); }
});

// ── DELETE /listings/:id/photos/:photoId — Remove a photo ────────────────────
listingRouter.delete('/:id/photos/:photoId', authenticate, requireRole('OWNER'), async (req, res, next) => {
  try {
    const listing = await prisma.listing.findUnique({ where: { id: param(req, 'id') } });
    if (!listing) throw new NotFoundError('Listing');
    if (listing.ownerId !== req.user!.id) throw new ForbiddenError('You can only modify your own listings');

    const photo = await prisma.listingPhoto.findFirst({ where: { id: param(req, 'photoId'), listingId: listing.id } });
    if (!photo) throw new NotFoundError('Photo');

    await prisma.listingPhoto.delete({ where: { id: photo.id } });
    res.json({ status: 'success', data: { message: 'Photo deleted' } });
  } catch (err) { next(err); }
});

export { listingRouter };
