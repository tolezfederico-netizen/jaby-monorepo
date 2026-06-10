import { z } from 'zod'

export const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  sort_order: z.number(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
})

export const CategoryCreateSchema = z.object({
  name: z.string(),
})

export const CategoryUpdateSchema = CategoryCreateSchema.partial()
