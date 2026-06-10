import { z } from 'zod'

export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  category_id: z.string().uuid(),
  image_url: z.string().nullable().optional(),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
})

export const ProductCreateSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  price: z.number().optional(),
  category_id: z.string().uuid(),
  image_url: z.string().optional(),
  is_active: z.boolean(),
  is_featured: z.boolean(),
})

export const ProductUpdateSchema = ProductCreateSchema.partial()
