import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { z } from 'zod'
import { OrderSchema, OrderStatusSchema } from '@shared/schemas/order'
import type { OrderStatusType } from '@shared/types/index'

const OrderWithItemsSchema = OrderSchema.extend({
  customer_phone: z.string().nullable().optional(),
  order_items: z.array(
    z.object({
      id: z.string().uuid(),
      product_id: z.string().uuid().nullable(),
      product_name: z.string(),
      quantity: z.number(),
      unit_price: z.number(),
      subtotal: z.number(),
    })
  ).optional().default([]),
})

export type OrderWithItemsType = z.infer<typeof OrderWithItemsSchema>

async function fetchOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return z.array(OrderWithItemsSchema).parse(data)
}

export function useOrders() {
  return useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: fetchOrders,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatusType }) => {
      const validatedStatus = OrderStatusSchema.parse(status)

      const updatePayload: Record<string, unknown> = { status: validatedStatus }

      if (validatedStatus === 'confirmed') {
        updatePayload.confirmed_at = new Date().toISOString()
      }
      if (validatedStatus === 'completed') {
        updatePayload.completed_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
    },
  })
}

export function useDeleteOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
    },
  })
}
