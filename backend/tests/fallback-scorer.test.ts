import { describe, it, expect } from 'vitest';
import {
  computeBudgetScore,
  computeLocationScore,
  computeTimingScore,
  scoreFallback,
} from '../src/services/fallback-scorer.js';
import type { Listing, TenantProfile } from '@prisma/client';

describe('computeBudgetScore', () => {
  it('perfect fit — rent at bottom of range', () => {
    expect(computeBudgetScore(10000, 10000, 20000)).toBe(50);
  });

  it('exact match — single point range', () => {
    expect(computeBudgetScore(15000, 15000, 15000)).toBe(50);
  });

  it('rent at top of range', () => {
    const score = computeBudgetScore(20000, 10000, 20000);
    expect(score).toBeGreaterThanOrEqual(35);
    expect(score).toBeLessThanOrEqual(50);
  });

  it('rent in middle of range', () => {
    const score = computeBudgetScore(15000, 10000, 20000);
    expect(score).toBeGreaterThanOrEqual(40);
  });

  it('rent slightly above range (within 10%)', () => {
    const score = computeBudgetScore(21000, 10000, 20000);
    expect(score).toBe(30);
  });

  it('rent far above range (>50%)', () => {
    const score = computeBudgetScore(50000, 10000, 20000);
    expect(score).toBe(0);
  });

  it('rent below range (within 25%)', () => {
    const score = computeBudgetScore(8000, 10000, 20000);
    expect(score).toBeGreaterThanOrEqual(10);
  });

  it('zero budget max returns 0', () => {
    expect(computeBudgetScore(10000, 0, 0)).toBe(0);
  });
});

describe('computeLocationScore', () => {
  it('exact match', () => {
    expect(computeLocationScore('Mumbai', 'Mumbai')).toBe(35);
  });

  it('case insensitive match', () => {
    expect(computeLocationScore('mumbai', 'Mumbai')).toBe(35);
  });

  it('partial match — listing contains preferred', () => {
    expect(computeLocationScore('South Mumbai', 'Mumbai')).toBe(20);
  });

  it('partial match — preferred contains listing', () => {
    expect(computeLocationScore('Mumbai', 'Greater Mumbai')).toBe(20);
  });

  it('no match', () => {
    expect(computeLocationScore('Delhi', 'Mumbai')).toBe(0);
  });

  it('whitespace handling', () => {
    expect(computeLocationScore('  Mumbai  ', 'Mumbai')).toBe(35);
  });
});

describe('computeTimingScore', () => {
  it('available before move-in', () => {
    expect(computeTimingScore(new Date('2025-07-01'), new Date('2025-08-01'))).toBe(15);
  });

  it('available on move-in date', () => {
    expect(computeTimingScore(new Date('2025-08-01'), new Date('2025-08-01'))).toBe(15);
  });

  it('available 10 days after move-in', () => {
    expect(computeTimingScore(new Date('2025-08-11'), new Date('2025-08-01'))).toBe(10);
  });

  it('available 25 days after move-in', () => {
    expect(computeTimingScore(new Date('2025-08-26'), new Date('2025-08-01'))).toBe(5);
  });

  it('available 2 months after move-in', () => {
    expect(computeTimingScore(new Date('2025-10-01'), new Date('2025-08-01'))).toBe(0);
  });
});

describe('scoreFallback (integration)', () => {
  const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
    id: 'l1', ownerId: 'o1', title: 'Test', description: 'Test', location: 'Mumbai',
    address: null, rent: 15000, deposit: null, availableFrom: new Date('2025-07-15'),
    roomType: 'SINGLE', furnishingStatus: 'FURNISHED', amenities: [], rules: [],
    maxOccupants: 1, status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  });

  const makeProfile = (overrides: Partial<TenantProfile> = {}): TenantProfile => ({
    id: 'p1', userId: 'u1', preferredLocation: 'Mumbai', budgetMin: 10000, budgetMax: 20000,
    moveInDate: new Date('2025-08-01'), occupation: null, lifestyle: null, bio: null,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  });

  it('perfect match — high score', () => {
    const result = scoreFallback(makeListing(), makeProfile());
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.explanation).toContain('Fallback scoring');
  });

  it('budget mismatch — lower score', () => {
    const result = scoreFallback(makeListing({ rent: 50000 }), makeProfile());
    expect(result.score).toBeLessThan(60);
  });

  it('location mismatch — lower score', () => {
    const result = scoreFallback(makeListing({ location: 'Kolkata' }), makeProfile());
    expect(result.score).toBeLessThan(70);
  });

  it('everything wrong — very low score', () => {
    const result = scoreFallback(
      makeListing({ rent: 100000, location: 'Kolkata', availableFrom: new Date('2026-06-01') }),
      makeProfile(),
    );
    expect(result.score).toBeLessThan(20);
  });

  it('score is always between 0 and 100', () => {
    for (let i = 0; i < 20; i++) {
      const result = scoreFallback(
        makeListing({ rent: Math.random() * 100000, location: i % 2 === 0 ? 'Mumbai' : 'X' }),
        makeProfile(),
      );
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
  });
});
