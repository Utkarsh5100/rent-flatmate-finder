import pinoHttp from 'pino-http';

import { logger } from '../lib/logger.js';

/**
 * HTTP request/response logging middleware using pino-http.
 * Automatically logs method, url, status code, and response time.
 */
export const requestLogger = pinoHttp({
  logger,
  // Don't log health check requests to reduce noise
  autoLogging: {
    ignore: (req) => req.url === '/api/health',
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
});
