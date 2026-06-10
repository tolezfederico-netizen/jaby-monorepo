import { z } from 'zod'

export const BannerSchema = z.object({
  id: z.string().uuid(),
  text: z.string().nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
})

export const BannerUpdateSchema = z.object({
  text: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
})
