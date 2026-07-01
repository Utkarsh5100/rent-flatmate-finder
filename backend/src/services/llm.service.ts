import type { Listing, TenantProfile } from '@prisma/client';
import { z } from 'zod';


import { logger } from '../lib/logger.js';

/** Schema for the expected LLM JSON response */
const llmResponseSchema = z.object({
  score: z.number().int().min(0).max(100),
  explanation: z.string().min(1),
});

export type ScoringResult = z.infer<typeof llmResponseSchema>;

function buildPrompt(listing: Listing, profile: TenantProfile): string {
  const listingJson = JSON.stringify({
    title: listing.title,
    location: listing.location,
    rent: listing.rent,
    roomType: listing.roomType,
    furnishingStatus: listing.furnishingStatus,
    amenities: listing.amenities,
    rules: listing.rules,
    availableFrom: listing.availableFrom,
  });

  const tenantJson = JSON.stringify({
    preferredLocation: profile.preferredLocation,
    budgetMin: profile.budgetMin,
    budgetMax: profile.budgetMax,
    moveInDate: profile.moveInDate,
    occupation: profile.occupation,
    lifestyle: profile.lifestyle,
    bio: profile.bio,
  });

  return `Given this room listing: ${listingJson} and this tenant profile: ${tenantJson}, compute a compatibility score from 0 to 100 based on budget match, location match, timing, and lifestyle fit. Return ONLY valid JSON: { "score": <number 0-100>, "explanation": "<brief reason>" }`;
}

/**
 * Call the configured LLM provider to score a listing-tenant pair.
 * Returns null if the call fails, times out, or returns invalid JSON.
 */
export async function scoreLLM(listing: Listing, profile: TenantProfile): Promise<ScoringResult | null> {
  const provider = process.env['LLM_PROVIDER'] ?? 'openai';
  const apiKey = process.env['LLM_API_KEY'];
  const model = process.env['LLM_MODEL'] ?? 'gpt-4o-mini';

  if (!apiKey) {
    logger.warn('LLM_API_KEY not set, skipping LLM scoring');
    return null;
  }

  const prompt = buildPrompt(listing, profile);

  try {
    if (provider === 'openai' || provider === 'claude') {
      // Use OpenAI SDK (works for both OpenAI and Anthropic via compatible endpoints)
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({
        apiKey,
        ...(provider === 'claude' ? { baseURL: 'https://api.anthropic.com/v1' } : {}),
      });

      const response = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        logger.warn('LLM returned empty content');
        return null;
      }

      const parsed = JSON.parse(content) as unknown;
      const result = llmResponseSchema.safeParse(parsed);

      if (!result.success) {
        logger.warn({ errors: result.error.issues }, 'LLM response failed schema validation');
        return null;
      }

      return result.data;
    }

    logger.warn({ provider }, 'Unknown LLM provider');
    return null;
  } catch (err) {
    logger.error({ err }, 'LLM scoring failed');
    return null;
  }
}
