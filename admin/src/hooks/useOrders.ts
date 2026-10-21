import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { z } from 'zod'
import { OrderSchema, OrderStatusSchema } from '@jaby/shared'
import type { OrderStatusType } from '@jaby/shared'

// TODO: mover a shared/schemas/order.ts y exportar desde @jaby/shared
const OrderWithItemsSchema = OrderSchema.extend({
  customer_phone: z.string().nullable().optional(),
  order_items: z
    .array(
      z.object({
        id: z.string().uuid(),
        product_id: z.string().uuid().nullable(),
        product_name: z.string(),
        quantity: z.number(),
        unit_price: z.number(),
        subtotal: z.number(),
      })
    )
    .optional()
    .default([]),
})

export type OrderWithItemsType = z.infer<typeof OrderWithItemsSchema>

// No se traen todos los pedidos de una: PostgREST corta en 1000 filas y la lista crece sin límite.
export const RECENT_ORDERS_DAYS = 30
const ORDERS_PAGE_SIZE = 100
const ORDER_STATUSES = ['pending', 'confirmed', 'in_progress', 'completed'] as const

function getRecentCutoff() {
  return new Date(Date.now() - RECENT_ORDERS_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

// Pedidos activos de los últimos 30 días, más los que siguen abiertos aunque sean más viejos
async function fetchRecentOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('is_archived', false)
    .or(`status.neq.completed,created_at.gte.${getRecentCutoff()}`)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return OrderWithItemsSchema.array().parse(data)
}

export function useOrders() {
  return useQuery({
    queryKey: ['admin', 'orders', 'recent'],
    queryFn: fetchRecentOrders,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  })
}

function usePagedOrders(kind: 'older' | 'archived', enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['admin', 'orders', kind],
    enabled,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = pageParam * ORDERS_PAGE_SIZE
      let query = supabase.from('orders').select('*, order_items(*)')
      query =
        kind === 'archived'
          ? query.eq('is_archived', true)
          : query
              .eq('is_archived', false)
              .eq('status', 'completed')
              .lt('created_at', getRecentCutoff())
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(from, from + ORDERS_PAGE_SIZE - 1)

      if (error) throw new Error(error.message)
      return OrderWithItemsSchema.array().parse(data)
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === ORDERS_PAGE_SIZE ? allPages.length : undefined,
  })
}

// Completados de hace más de 30 días, de a páginas ("Ver más antiguos")
export function useOlderOrders(enabled: boolean) {
  return usePagedOrders('older', enabled)
}

export function useArchivedOrders(enabled: boolean) {
  return usePagedOrders('archived', enabled)
}

// Contadores exactos de las pestañas, sin depender de cuántos pedidos estén cargados
export function useOrderCounts() {
  return useQuery({
    queryKey: ['admin', 'orders', 'counts'],
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
    queryFn: async () => {
      const countWhere = async (status: OrderStatusType | null, isArchived: boolean) => {
        let query = supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('is_archived', isArchived)
        if (status) query = query.eq('status', status)
        const { count, error } = await query
        if (error) throw new Error(error.message)
        return count ?? 0
      }

      const [active, archived, ...byStatus] = await Promise.all([
        countWhere(null, false),
        countWhere(null, true),
        ...ORDER_STATUSES.map((status) => countWhere(status, false)),
      ])
      const statusCounts = Object.fromEntries(
        ORDER_STATUSES.map((status, index) => [status, byStatus[index]])
      ) as Record<OrderStatusType, number>

      return { active, archived, ...statusCounts }
    },
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
      const { data, error } = await supabase.from('orders').delete().eq('id', id).select()

      if (error) throw new Error(error.message)
      if (!data || data.length === 0) {
        throw new Error(
          'No se encontró el registro a eliminar, o no tenés permisos para eliminarlo'
        )
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
    },
  })
}

export function useArchiveOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, is_archived }: { id: string; is_archived: boolean }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ is_archived })
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
