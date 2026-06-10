import { z } from 'zod'

export const StoreConfigSchema = z.object({
  id: z.string().uuid(),
  store_name: z.string(),
  address: z.string(),
  whatsapp_number: z.string(),
  business_hours_open: z.string(),
  business_hours_close: z.string(),
  show_prices: z.boolean(),
  instagram_url: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  is_app_active: z.boolean(),
  delivery_enabled: z.boolean(),
  delivery_hours_open: z.string(),
  delivery_hours_close: z.string(),
  delivery_cost: z.number(),
  delivery_minimum_order: z.number(),
  delivery_coverage_zones: z.array(z.string()),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
})
