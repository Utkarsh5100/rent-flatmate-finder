import type { Server as HttpServer } from 'node:http';

import { Server } from 'socket.io';

import { verifyAccessToken } from './jwt.js';
import { logger } from './logger.js';
import { prisma } from './prisma.js';

let io: Server | null = null;

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

export function initSocketIO(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: process.env['FRONTEND_URL'] ?? process.env['CORS_ORIGIN'] ?? 'http://localhost:3000', credentials: true },
    pingTimeout: 60000,
  });

  // ── JWT Authentication middleware ──────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth['token'] as string | undefined;
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = verifyAccessToken(token);
      (socket.data as Record<string, unknown>)['userId'] = payload.userId;
      (socket.data as Record<string, unknown>)['role'] = payload.role;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = (socket.data as Record<string, unknown>)['userId'] as string;
    logger.info({ userId, socketId: socket.id }, 'Socket connected');

    // Join user's personal room for notifications
    void socket.join(`user:${userId}`);

    // ── Join conversation room ────────────────────────────────────────────
    socket.on('join:conversation', async (conversationId: string) => {
      try {
        // Verify user is a participant (tenant or listing owner)
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: {
            interestRequest: {
              include: { listing: { select: { ownerId: true } } },
            },
          },
        });

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        const ir = conversation.interestRequest;
        if (ir.status !== 'ACCEPTED') {
          socket.emit('error', { message: 'Interest request not accepted' });
          return;
        }

        const isParticipant = userId === ir.tenantId || userId === ir.listing.ownerId;
        if (!isParticipant) {
          socket.emit('error', { message: 'Not a participant' });
          return;
        }

        void socket.join(`conversation:${conversationId}`);
        socket.emit('joined:conversation', { conversationId });

        // Mark unread messages as read
        await prisma.chatMessage.updateMany({
          where: { conversationId, senderId: { not: userId }, readAt: null },
          data: { readAt: new Date() },
        });

        // Notify other participant of read receipts
        socket.to(`conversation:${conversationId}`).emit('messages:read', {
          conversationId,
          readBy: userId,
          readAt: new Date().toISOString(),
        });
      } catch (err) {
        logger.error({ err, conversationId }, 'Failed to join conversation');
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // ── Send message ──────────────────────────────────────────────────────
    socket.on('message:send', async (data: { conversationId: string; content: string; tempId?: string }) => {
      try {
        const { conversationId, content, tempId } = data;
        if (!content?.trim()) return;

        // Verify participation
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: { interestRequest: { include: { listing: { select: { ownerId: true } } } } },
        });

        if (!conversation) return;
        const ir = conversation.interestRequest;
        if (ir.status !== 'ACCEPTED') return;
        if (userId !== ir.tenantId && userId !== ir.listing.ownerId) return;

        // Persist message
        const message = await prisma.chatMessage.create({
          data: { conversationId, senderId: userId, content: content.trim() },
        });

        // Broadcast to conversation room
        io!.to(`conversation:${conversationId}`).emit('message:new', {
          id: message.id,
          conversationId,
          senderId: message.senderId,
          content: message.content,
          readAt: null,
          createdAt: message.createdAt.toISOString(),
          tempId, // for client-side reconciliation
        });
      } catch (err) {
        logger.error({ err }, 'Failed to send message');
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── Typing indicators ─────────────────────────────────────────────────
    socket.on('typing:start', (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit('typing:start', { userId, conversationId });
    });

    socket.on('typing:stop', (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit('typing:stop', { userId, conversationId });
    });

    // ── Mark messages read ────────────────────────────────────────────────
    socket.on('messages:markRead', async (conversationId: string) => {
      try {
        await prisma.chatMessage.updateMany({
          where: { conversationId, senderId: { not: userId }, readAt: null },
          data: { readAt: new Date() },
        });
        socket.to(`conversation:${conversationId}`).emit('messages:read', {
          conversationId,
          readBy: userId,
          readAt: new Date().toISOString(),
        });
      } catch (err) {
        logger.error({ err }, 'Failed to mark messages read');
      }
    });

    socket.on('disconnect', () => {
      logger.info({ userId, socketId: socket.id }, 'Socket disconnected');
    });
  });

  logger.info('Socket.IO initialized');
  return io;
}
