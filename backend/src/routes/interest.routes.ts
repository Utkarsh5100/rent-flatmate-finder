import type { Request } from 'express';
import { Router } from 'express';

import { ConflictError, ForbiddenError, NotFoundError } from '../errors/index.js';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { sendHighScoreInterestEmail, sendInterestDecisionEmail } from '../services/email.service.js';
import { createNotification } from '../services/notification.service.js';
import { expressInterestSchema, resolveInterestSchema } from '../validators/interest.validators.js';

const interestRouter = Router();
const HIGH_SCORE_THRESHOLD = parseInt(process.env['HIGH_SCORE_THRESHOLD'] ?? '80', 10);

function param(req: Request, key: string): string {
  return req.params[key] as string;
}

// ── POST /interests — Tenant express interest ────────────────────────────────
interestRouter.post('/', authenticate, requireRole('TENANT'), validate(expressInterestSchema), async (req, res, next) => {
  try {
    const { listingId, message } = req.body as { listingId: string; message?: string };
    const tenantId = req.user!.id;

    const listing = await prisma.listing.findUnique({ where: { id: listingId }, include: { owner: true } });
    if (!listing) throw new NotFoundError('Listing');
    if (listing.status !== 'ACTIVE') throw new ConflictError('Listing is not active');

    const existing = await prisma.interestRequest.findUnique({
      where: { tenantId_listingId: { tenantId, listingId } },
    });
    if (existing) throw new ConflictError('You have already expressed interest in this listing');

    const interest = await prisma.interestRequest.create({
      data: { tenantId, listingId, message },
      include: { listing: { select: { title: true } }, tenant: { select: { firstName: true, lastName: true } } },
    });

    // Notification + email for owner
    void createNotification({
      userId: listing.ownerId,
      type: 'INTEREST_RECEIVED',
      title: 'New interest request',
      message: `${req.user!.firstName} ${req.user!.lastName} is interested in "${listing.title}"`,
      metadata: { interestRequestId: interest.id, listingId, tenantId },
    });

    // Check compatibility score for high-score email
    const score = await prisma.compatibilityScore.findUnique({
      where: { tenantId_listingId: { tenantId, listingId } },
    });
    if (score && score.score >= HIGH_SCORE_THRESHOLD) {
      sendHighScoreInterestEmail(
        listing.owner.email,
        `${req.user!.firstName} ${req.user!.lastName}`,
        listing.title,
        score.score,
      );
    }

    res.status(201).json({ status: 'success', data: { interest } });
  } catch (err) { next(err); }
});

// ── GET /interests/mine — Tenant's sent interests ────────────────────────────
interestRouter.get('/mine', authenticate, requireRole('TENANT'), async (req, res, next) => {
  try {
    const interests = await prisma.interestRequest.findMany({
      where: { tenantId: req.user!.id },
      include: { listing: { select: { id: true, title: true, location: true, rent: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ status: 'success', data: { interests } });
  } catch (err) { next(err); }
});

// ── GET /interests/received — Owner's received interests ─────────────────────
interestRouter.get('/received', authenticate, requireRole('OWNER'), async (req, res, next) => {
  try {
    const interests = await prisma.interestRequest.findMany({
      where: { listing: { ownerId: req.user!.id } },
      include: {
        tenant: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        listing: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ status: 'success', data: { interests } });
  } catch (err) { next(err); }
});

// ── PATCH /interests/:id — Owner accept/decline ──────────────────────────────
interestRouter.patch('/:id', authenticate, requireRole('OWNER'), validate(resolveInterestSchema), async (req, res, next) => {
  try {
    const interest = await prisma.interestRequest.findUnique({
      where: { id: param(req, 'id') },
      include: { listing: { select: { ownerId: true, title: true } }, tenant: { select: { id: true, email: true, firstName: true } } },
    });
    if (!interest) throw new NotFoundError('Interest request');
    if (interest.listing.ownerId !== req.user!.id) throw new ForbiddenError('Not your listing');
    if (interest.status !== 'PENDING') throw new ConflictError('Interest already resolved');

    const { status } = req.body as { status: 'ACCEPTED' | 'DECLINED' };

    const updated = await prisma.interestRequest.update({
      where: { id: interest.id },
      data: { status, resolvedAt: new Date() },
    });

    // If accepted, create conversation
    if (status === 'ACCEPTED') {
      await prisma.conversation.create({ data: { interestRequestId: interest.id } });
    }

    // Notification + email for tenant
    void createNotification({
      userId: interest.tenant.id,
      type: status === 'ACCEPTED' ? 'INTEREST_ACCEPTED' : 'INTEREST_DECLINED',
      title: `Interest ${status.toLowerCase()}`,
      message: `Your interest in "${interest.listing.title}" was ${status.toLowerCase()}`,
      metadata: { interestRequestId: interest.id, listingId: interest.listingId },
    });

    sendInterestDecisionEmail(interest.tenant.email, interest.listing.title, status);

    res.json({ status: 'success', data: { interest: updated } });
  } catch (err) { next(err); }
});

export { interestRouter };
