import type { UserRole } from '@prisma/client';
import jwt from 'jsonwebtoken';


// ── Token payload ────────────────────────────────────────────────────────────

export interface TokenPayload {
  userId: string;
  role: UserRole;
}

// ── Secrets & expiry ─────────────────────────────────────────────────────────

function getAccessSecret(): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return secret;
}

function getRefreshSecret(): string {
  // Use a separate secret for refresh tokens; fall back to JWT_SECRET + suffix
  return process.env['JWT_REFRESH_SECRET'] ?? getAccessSecret() + '-refresh';
}

const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '30d';

// ── Generate tokens ──────────────────────────────────────────────────────────

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, getAccessSecret(), { expiresIn: ACCESS_EXPIRY });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, getRefreshSecret(), { expiresIn: REFRESH_EXPIRY });
}

// ── Verify tokens ────────────────────────────────────────────────────────────

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, getAccessSecret()) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, getRefreshSecret()) as TokenPayload;
}
