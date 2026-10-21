import { z } from 'zod'

export const OrderStatusSchema = z.enum(['pending', 'confirmed', 'in_progress', 'completed'])

export const OrderModalitySchema = z.enum(['pickup', 'delivery'])

// Límites del pedido: mantener sincronizados con supabase/functions/create-order/index.ts
export const MAX_ITEM_QUANTITY = 99
export const MAX_ORDER_ITEMS = 50

const OrderItemCreateSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string(),
  quantity: z.number().int().positive().max(MAX_ITEM_QUANTITY),
  unit_price: z.number(),
  subtotal: z.number(),
})

export const OrderSchema = z.object({
  id: z.string().uuid(),
  order_number: z.number(),
  modality: OrderModalitySchema,
  status: OrderStatusSchema,
  customer_name: z.string(),
  customer_phone: z.string().nullable().optional(),
  customer_address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  total: z.number(),
  delivery_cost: z.number().nullable().optional(),
  is_archived: z.boolean().optional().default(false),
  created_at: z.string().nullable().optional(),
  confirmed_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
})

export const OrderCreateSchema = z.object({
  modality: OrderModalitySchema,
  customer_name: z.string().max(100, 'El nombre es demasiado largo'),
  customer_phone: z.string(),
  customer_address: z.string().max(200, 'La dirección es demasiado larga').optional(),
  notes: z.string().max(300, 'Las notas son demasiado largas').optional(),
  items: z.array(OrderItemCreateSchema).max(MAX_ORDER_ITEMS),
  total: z.number(),
  delivery_cost: z.number().optional(),
  marketing_consent: z.boolean().optional(),
})
