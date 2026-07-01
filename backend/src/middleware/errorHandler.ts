import type { NextFunction, Request, Response } from 'express';

import { AppError, ValidationError } from '../errors/index.js';
import { logger } from '../lib/logger.js';

/**
 * Centralized error-handling middleware.
 *
 * - Operational errors (AppError subclasses): return structured JSON with the error's status code.
 * - Unexpected errors: log the full error and return a generic 500 response.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Operational errors — safe to expose to the client
  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      status: 'error',
      statusCode: err.statusCode,
      message: err.message,
    };

    // Attach field-level validation errors if present
    if (err instanceof ValidationError && err.errors) {
      body['errors'] = err.errors;
    }

    res.status(err.statusCode).json(body);
    return;
  }

  // Unexpected / programmer errors — log and return generic 500
  logger.error({ err }, 'Unhandled error');

  res.status(500).json({
    status: 'error',
    statusCode: 500,
    message: 'Internal server error',
  });
}
