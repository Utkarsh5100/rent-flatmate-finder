import type { Request } from 'express';
import { Router } from 'express';

import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';

const notificationRouter = Router();

function param(req: Request, key: string): string {
  return req.params[key] as string;
}

// ── GET /notifications — User's notifications ────────────────────────────────
notificationRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.id, read: false },
    });
    res.json({ status: 'success', data: { notifications, unreadCount } });
  } catch (err) { next(err); }
});

// ── PATCH /notifications/:id/read — Mark as read ─────────────────────────────
notificationRouter.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: param(req, 'id'), userId: req.user!.id },
      data: { read: true },
    });
    res.json({ status: 'success', data: { message: 'Marked as read' } });
  } catch (err) { next(err); }
});

// ── PATCH /notifications/read-all — Mark all as read ─────────────────────────
notificationRouter.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    });
    res.json({ status: 'success', data: { message: 'All marked as read' } });
  } catch (err) { next(err); }
});

export { notificationRouter };
