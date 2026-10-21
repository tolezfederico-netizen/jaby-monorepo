import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { z } from 'zod'

const CustomerSchema = z.object({
  id: z.string().uuid(),
  phone: z.string(),
  name: z.string(),
  last_address: z.string().nullable(),
  address_history: z.array(z.string()),
  total_orders: z.number(),
  first_seen_at: z.string(),
  last_seen_at: z.string(),
  last_modality: z.string().nullable(),
  marketing_consent: z.boolean().optional().default(false),
})

export type CustomerType = z.infer<typeof CustomerSchema>

export type CustomerSort = 'recent' | 'orders' | 'name'

export interface CustomerFilters {
  search: string
  sort: CustomerSort
  acceptedOnly: boolean
}

// Búsqueda, orden y filtro se resuelven en la base: PostgREST corta en 1000 filas
const CUSTOMERS_PAGE_SIZE = 100
const EXPORT_BATCH_SIZE = 1000

function buildCustomersQuery({ search, sort, acceptedOnly }: CustomerFilters) {
  let query = supabase.from('customers').select('*', { count: 'exact' })

  if (acceptedOnly) query = query.eq('marketing_consent', true)

  // Se sacan los caracteres que tienen significado en la sintaxis de filtros de PostgREST
  const term = search
    .trim()
    .replace(/[,()*%\\]/g, ' ')
    .trim()
  if (term) query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%`)

  if (sort === 'orders') {
    query = query
      .order('total_orders', { ascending: false })
      .order('last_seen_at', { ascending: false })
  } else if (sort === 'name') {
    query = query.order('name', { ascending: true })
  } else {
    query = query.order('last_seen_at', { ascending: false })
  }

  return query
}

export function useCustomers(filters: CustomerFilters) {
  return useInfiniteQuery({
    queryKey: ['admin', 'customers', 'list', filters],
    initialPageParam: 0,
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam }) => {
      const from = pageParam * CUSTOMERS_PAGE_SIZE
      const { data, count, error } = await buildCustomersQuery(filters).range(
        from,
        from + CUSTOMERS_PAGE_SIZE - 1
      )

      if (error) throw new Error(error.message)
      return { rows: CustomerSchema.array().parse(data), count: count ?? 0 }
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.rows.length === CUSTOMERS_PAGE_SIZE ? allPages.length : undefined,
  })
}

// Totales para los chips y el menú de exportación, sin depender de lo que esté cargado
export function useCustomerCounts() {
  return useQuery({
    queryKey: ['admin', 'customers', 'counts'],
    staleTime: 1000 * 60,
    queryFn: async () => {
      const countWhere = async (acceptedOnly: boolean) => {
        let query = supabase.from('customers').select('id', { count: 'exact', head: true })
        if (acceptedOnly) query = query.eq('marketing_consent', true)
        const { count, error } = await query
        if (error) throw new Error(error.message)
        return count ?? 0
      }
      const [total, accepted] = await Promise.all([countWhere(false), countWhere(true)])
      return { total, accepted }
    },
  })
}

// Para el Excel: trae todos los clientes en tandas, ordenados por último pedido
export async function fetchAllCustomers(acceptedOnly: boolean): Promise<CustomerType[]> {
  const all: CustomerType[] = []
  for (let from = 0; ; from += EXPORT_BATCH_SIZE) {
    const { data, error } = await buildCustomersQuery({
      search: '',
      sort: 'recent',
      acceptedOnly,
    }).range(from, from + EXPORT_BATCH_SIZE - 1)

    if (error) throw new Error(error.message)
    const rows = CustomerSchema.array().parse(data)
    all.push(...rows)
    if (rows.length < EXPORT_BATCH_SIZE) return all
  }
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('customers').delete().eq('id', id).select()

      if (error) throw new Error(error.message)
      if (!data || data.length === 0) {
        throw new Error(
          'No se encontró el registro a eliminar, o no tenés permisos para eliminarlo'
        )
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] })
    },
  })
}
