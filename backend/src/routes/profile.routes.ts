import { Router } from 'express';

import { NotFoundError } from '../errors/index.js';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { upsertProfileSchema } from '../validators/profile.validators.js';

const profileRouter = Router();

// ── GET /profile — Get current tenant's profile ─────────────────────────────
profileRouter.get('/', authenticate, requireRole('TENANT'), async (req, res, next) => {
  try {
    const profile = await prisma.tenantProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) throw new NotFoundError('Tenant profile');
    res.json({ status: 'success', data: { profile } });
  } catch (err) { next(err); }
});

// ── POST /profile — Create or update tenant profile ─────────────────────────
profileRouter.post('/', authenticate, requireRole('TENANT'), validate(upsertProfileSchema), async (req, res, next) => {
  try {
    const data = req.body as {
      preferredLocation: string;
      budgetMin: number;
      budgetMax: number;
      moveInDate: Date;
      occupation?: string;
      lifestyle?: string;
      bio?: string;
    };

    const profile = await prisma.tenantProfile.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id, ...data },
      update: data,
    });

    res.json({ status: 'success', data: { profile } });
  } catch (err) { next(err); }
});

export { profileRouter };
