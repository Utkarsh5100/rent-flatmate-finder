import { z } from 'zod';

export const expressInterestSchema = z.object({
  listingId: z.string().min(1),
  message: z.string().max(1000).optional(),
});

export const resolveInterestSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED']),
});
