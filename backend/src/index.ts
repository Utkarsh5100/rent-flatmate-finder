import { createServer } from 'node:http';

import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';

import { NotFoundError } from './errors/index.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { initSocketIO } from './lib/socket.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { apiRouter } from './routes/index.js';

// ── Load environment variables ──────────────────────────────────────────
dotenv.config();

// ── Create Express app ──────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);
const PORT = parseInt(process.env['PORT'] ?? '5000', 10);
const CORS_ORIGIN = process.env['FRONTEND_URL'] ?? process.env['CORS_ORIGIN'] ?? 'http://localhost:3000';

// ── Global middleware ───────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ── Static files (uploaded photos) ──────────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ── Routes ──────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

// ── 404 catch-all ───────────────────────────────────────────────────────
app.use((_req, _res, next) => {
  next(new NotFoundError('Route'));
});

// ── Centralized error handler (must be last) ────────────────────────────
app.use(errorHandler);

// ── Socket.IO ───────────────────────────────────────────────────────────
const io = initSocketIO(httpServer);

// ── Start server ────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
  logger.info(`📋 Health check: http://localhost:${PORT}/api/health`);
  logger.info(`🔌 Socket.IO ready`);
  logger.info(`🌍 Environment: ${process.env['NODE_ENV'] ?? 'development'}`);
});

// ── Graceful shutdown ───────────────────────────────────────────────────
function gracefulShutdown(signal: string) {
  logger.info(`${signal} received — shutting down gracefully`);

  // Close Socket.IO connections first
  void new Promise<void>((resolve) => {
    void io.close(() => {
      logger.info('Socket.IO connections closed');
      resolve();
    });
  });

  // Then close HTTP server (stop accepting new requests)
  httpServer.close(() => {
    logger.info('HTTP server closed');
    void prisma.$disconnect().then(() => {
      logger.info('Database disconnected');
      process.exit(0);
    });
  });

  // Force exit after 10s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { app };
