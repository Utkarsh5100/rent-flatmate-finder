import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for auth endpoints — prevents brute force attacks.
 * 10 requests per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    statusCode: 429,
    message: 'Too many requests. Please try again later.',
  },
});
