import { z } from 'zod';

export const createListingSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().min(10).max(5000).trim(),
  location: z.string().min(1).max(200).trim(),
  address: z.string().max(500).optional(),
  rent: z.coerce.number().int().positive(),
  deposit: z.coerce.number().int().nonnegative().optional(),
  availableFrom: z.coerce.date(),
  roomType: z.enum(['SINGLE', 'DOUBLE', 'SHARED', 'STUDIO', 'APARTMENT']),
  furnishingStatus: z.enum(['FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED']),
  amenities: z.preprocess(v => typeof v === 'string' ? JSON.parse(v) as unknown : v, z.array(z.string()).default([])),
  rules: z.preprocess(v => typeof v === 'string' ? JSON.parse(v) as unknown : v, z.array(z.string()).default([])),
  maxOccupants: z.coerce.number().int().min(1).default(1),
});

export const updateListingSchema = createListingSchema.partial();

export const listingQuerySchema = z.object({
  location: z.string().optional(),
  minRent: z.coerce.number().int().optional(),
  maxRent: z.coerce.number().int().optional(),
  roomType: z.enum(['SINGLE', 'DOUBLE', 'SHARED', 'STUDIO', 'APARTMENT']).optional(),
  furnishingStatus: z.enum(['FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  includeFilled: z.preprocess(v => v === 'true', z.boolean().default(false)),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type ListingQuery = z.infer<typeof listingQuerySchema>;
