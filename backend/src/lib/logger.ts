import pino from 'pino';

const isProduction = process.env['NODE_ENV'] === 'production';

/**
 * Application-wide Pino logger.
 *
 * - Production: JSON output for structured log ingestion.
 * - Development: Pretty-printed with colors for readability.
 */
export const logger = pino({
  level: process.env['LOG_LEVEL'] ?? (isProduction ? 'info' : 'debug'),
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }),
});
