import { Router } from 'express';

const healthRouter = Router();

/**
 * GET /api/health
 *
 * Lightweight health-check endpoint for load balancers and monitoring.
 * Returns server status, uptime, and current timestamp.
 */
healthRouter.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'] ?? 'development',
  });
});

export { healthRouter };
