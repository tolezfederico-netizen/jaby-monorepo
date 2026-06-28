import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
})

export type CustomerType = z.infer<typeof CustomerSchema>

async function fetchCustomers(): Promise<CustomerType[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('last_seen_at', { ascending: false })

  if (error) throw new Error(error.message)
  return CustomerSchema.array().parse(data)
}

export function useCustomers() {
  return useQuery({
    queryKey: ['admin', 'customers'],
    queryFn: fetchCustomers,
    staleTime: 1000 * 60,
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] })
    },
  })
}
