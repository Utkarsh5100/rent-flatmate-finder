import { Router } from 'express';

import { prisma } from '../lib/prisma.js';

const healthRouter = Router();

/**
 * GET /api/health
 *
 * Health-check endpoint for load balancers and monitoring.
 * Returns server status, uptime, current timestamp, and database connectivity.
 */
healthRouter.get('/', async (_req, res) => {
  let databaseStatus = 'connected';
  let statusCode = 200;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    databaseStatus = 'disconnected';
    statusCode = 503;
  }

  res.status(statusCode).json({
    status: statusCode === 200 ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'] ?? 'development',
    database: {
      status: databaseStatus,
    },
  });
});

export { healthRouter };
