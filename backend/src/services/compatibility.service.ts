import type { Listing, TenantProfile } from '@prisma/client';

import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';

import { scoreFallback } from './fallback-scorer.js';
import { scoreLLM } from './llm.service.js';

/**
 * Get or compute the compatibility score for a tenant-listing pair.
 * Returns the cached score if still fresh, otherwise recomputes.
 */
export async function getCompatibilityScore(
  tenantId: string,
  listing: Listing,
  profile: TenantProfile,
) {
  // Check for existing cached score
  const existing = await prisma.compatibilityScore.findUnique({
    where: { tenantId_listingId: { tenantId, listingId: listing.id } },
  });

  // If cached score exists and is still fresh (computed after both listing and profile were last updated)
  if (existing) {
    const computedAt = existing.computedAt.getTime();
    const listingUpdated = listing.updatedAt.getTime();
    const profileUpdated = profile.updatedAt.getTime();

    if (computedAt > listingUpdated && computedAt > profileUpdated) {
      return existing;
    }
    // Stale — recompute
    logger.debug({ tenantId, listingId: listing.id }, 'Score stale, recomputing');
  }

  // Try LLM first
  const llmResult = await scoreLLM(listing, profile);

  let score: number;
  let explanation: string;
  let computedVia: 'LLM' | 'FALLBACK';

  if (llmResult) {
    score = llmResult.score;
    explanation = llmResult.explanation;
    computedVia = 'LLM';
  } else {
    logger.info({ tenantId, listingId: listing.id }, 'Using fallback scorer');
    const fallback = scoreFallback(listing, profile);
    score = fallback.score;
    explanation = fallback.explanation;
    computedVia = 'FALLBACK';
  }

  // Upsert the score
  const result = await prisma.compatibilityScore.upsert({
    where: { tenantId_listingId: { tenantId, listingId: listing.id } },
    create: { tenantId, listingId: listing.id, score, explanation, computedVia, computedAt: new Date() },
    update: { score, explanation, computedVia, computedAt: new Date() },
  });

  return result;
}

/**
 * Batch-compute scores for multiple listings for a single tenant.
 * Returns a map of listingId -> score data.
 */
export async function batchGetScores(
  tenantId: string,
  listings: Listing[],
  profile: TenantProfile,
): Promise<Map<string, { score: number; explanation: string; computedVia: string }>> {
  const results = new Map<string, { score: number; explanation: string; computedVia: string }>();

  // Parallel scoring with concurrency limit
  const promises = listings.map(async (listing) => {
    const result = await getCompatibilityScore(tenantId, listing, profile);
    results.set(listing.id, { score: result.score, explanation: result.explanation, computedVia: result.computedVia });
  });

  await Promise.all(promises);
  return results;
}
