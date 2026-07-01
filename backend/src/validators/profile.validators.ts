import { z } from 'zod';

export const upsertProfileSchema = z.object({
  preferredLocation: z.string().min(1).max(200).trim(),
  budgetMin: z.number().int().nonnegative(),
  budgetMax: z.number().int().positive(),
  moveInDate: z.coerce.date(),
  occupation: z.string().max(200).optional(),
  lifestyle: z.string().max(500).optional(),
  bio: z.string().max(2000).optional(),
}).refine(d => d.budgetMax >= d.budgetMin, { message: 'budgetMax must be >= budgetMin', path: ['budgetMax'] });

export type UpsertProfileInput = z.infer<typeof upsertProfileSchema>;
