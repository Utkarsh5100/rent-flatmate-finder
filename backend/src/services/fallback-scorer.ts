import type { Listing, TenantProfile } from '@prisma/client';

import type { ScoringResult } from './llm.service.js';

/**
 * Deterministic rule-based fallback scorer.
 * Used when LLM is unavailable, times out, or returns invalid data.
 *
 * Scoring rubric (total 100):
 *   - Budget match:    0–50 points (overlap % between tenant range and listing rent)
 *   - Location match:  0–35 points (exact match = 35, partial/contains = 20, none = 0)
 *   - Timing match:    0–15 points (listing available before/on tenant move-in = 15)
 */
export function scoreFallback(listing: Listing, profile: TenantProfile): ScoringResult {
  let score = 0;
  const reasons: string[] = [];

  // ── Budget match (0-50) ───────────────────────────────────────────────
  const budgetScore = computeBudgetScore(listing.rent, profile.budgetMin, profile.budgetMax);
  score += budgetScore;
  if (budgetScore >= 45) reasons.push('Rent fits perfectly within budget');
  else if (budgetScore >= 25) reasons.push('Rent partially fits budget');
  else reasons.push('Rent is outside preferred budget range');

  // ── Location match (0-35) ─────────────────────────────────────────────
  const locationScore = computeLocationScore(listing.location, profile.preferredLocation);
  score += locationScore;
  if (locationScore >= 30) reasons.push('Location matches preference');
  else if (locationScore > 0) reasons.push('Partial location match');
  else reasons.push('Location does not match preference');

  // ── Timing match (0-15) ───────────────────────────────────────────────
  const timingScore = computeTimingScore(listing.availableFrom, profile.moveInDate);
  score += timingScore;
  if (timingScore >= 12) reasons.push('Available before move-in date');
  else if (timingScore > 0) reasons.push('Available close to move-in date');
  else reasons.push('Not available by preferred move-in date');

  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    explanation: `Fallback scoring: ${reasons.join('. ')}.`,
  };
}

/**
 * Budget scoring (0-50).
 * Perfect fit = 50, rent within range but near edges = 25-49, outside = 0-24 based on proximity.
 */
export function computeBudgetScore(rent: number, budgetMin: number, budgetMax: number): number {
  if (budgetMax <= 0) return 0;

  // Rent is within budget range
  if (rent >= budgetMin && rent <= budgetMax) {
    const range = budgetMax - budgetMin;
    if (range === 0) return 50; // exact match
    // Score higher when rent is closer to the middle/lower end of range
    const position = (rent - budgetMin) / range;
    // Best when position is 0-0.5 (lower half), okay at higher
    return Math.round(50 - position * 15);
  }

  // Rent is outside range — score based on how close
  const distance = rent < budgetMin ? budgetMin - rent : rent - budgetMax;
  const midpoint = (budgetMin + budgetMax) / 2 || 1;
  const ratio = distance / midpoint;

  if (ratio <= 0.1) return 30;  // within 10% of range
  if (ratio <= 0.25) return 20; // within 25%
  if (ratio <= 0.5) return 10;  // within 50%
  return 0;
}

/**
 * Location scoring (0-35).
 * Case-insensitive comparison, supports partial matching.
 */
export function computeLocationScore(listingLocation: string, preferredLocation: string): number {
  const a = listingLocation.toLowerCase().trim();
  const b = preferredLocation.toLowerCase().trim();

  if (a === b) return 35;
  if (a.includes(b) || b.includes(a)) return 20;
  return 0;
}

/**
 * Timing scoring (0-15).
 * Available on or before move-in = 15, within 2 weeks after = 10, within a month = 5.
 */
export function computeTimingScore(availableFrom: Date, moveInDate: Date): number {
  const diffMs = new Date(availableFrom).getTime() - new Date(moveInDate).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 0) return 15;   // available on or before move-in
  if (diffDays <= 14) return 10;  // within 2 weeks
  if (diffDays <= 30) return 5;   // within a month
  return 0;
}
