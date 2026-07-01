import type { Request } from 'express';
import { Router } from 'express';

import { ForbiddenError, NotFoundError } from '../errors/index.js';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';

const chatRouter = Router();

function param(req: Request, key: string): string {
  return req.params[key] as string;
}

// ── GET /chat/conversations — User's conversations ───────────────────────────
chatRouter.get('/conversations', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const conversations = await prisma.conversation.findMany({
      where: {
        interestRequest: {
          OR: [
            { tenantId: userId },
            { listing: { ownerId: userId } },
          ],
          status: 'ACCEPTED',
        },
      },
      include: {
        interestRequest: {
          include: {
            tenant: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            listing: { select: { id: true, title: true, ownerId: true, owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } },
          },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const result = conversations.map(c => {
      const ir = c.interestRequest;
      const otherUser = userId === ir.tenantId
        ? ir.listing.owner
        : ir.tenant;
      return {
        id: c.id,
        otherUser,
        listing: { id: ir.listing.id, title: ir.listing.title },
        lastMessage: c.messages[0] ?? null,
        updatedAt: c.updatedAt,
      };
    });

    res.json({ status: 'success', data: { conversations: result } });
  } catch (err) { next(err); }
});

// ── GET /chat/:conversationId/messages — Paginated message history ───────────
chatRouter.get('/:conversationId/messages', authenticate, async (req, res, next) => {
  try {
    const conversationId = param(req, 'conversationId');
    const userId = req.user!.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { interestRequest: { include: { listing: { select: { ownerId: true } } } } },
    });

    if (!conversation) throw new NotFoundError('Conversation');
    const ir = conversation.interestRequest;
    if (ir.status !== 'ACCEPTED') throw new ForbiddenError('Interest not accepted');
    if (userId !== ir.tenantId && userId !== ir.listing.ownerId) throw new ForbiddenError('Not a participant');

    const cursor = req.query['cursor'] as string | undefined;
    const limit = Math.min(parseInt(req.query['limit'] as string || '30', 10), 50);

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    res.json({
      status: 'success',
      data: {
        messages: messages.reverse(),
        hasMore,
        nextCursor: hasMore ? messages[0]?.id : null,
      },
    });
  } catch (err) { next(err); }
});

export { chatRouter };
