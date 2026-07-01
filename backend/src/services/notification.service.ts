import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma.js';

interface CreateNotification {
  userId: string;
  type: 'INTEREST_RECEIVED' | 'INTEREST_ACCEPTED' | 'INTEREST_DECLINED' | 'NEW_MESSAGE' | 'LISTING_FILLED' | 'COMPATIBILITY_COMPUTED' | 'SYSTEM';
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/** Create an in-app notification. Non-blocking — logs failure. */
export async function createNotification(data: CreateNotification) {
  try {
    await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: (data.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
  } catch (err) {
    // Import logger lazily to avoid circular deps
    const { logger } = await import('../lib/logger.js');
    logger.error({ err, userId: data.userId }, 'Failed to create notification');
  }
}
