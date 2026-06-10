import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { OrderCreateSchema } from '@shared/schemas/order'
import type { OrderCreateType } from '@shared/types/index'

interface CreateOrderResult {
  order_id: string
  order_number: number
}

async function createOrder(payload: OrderCreateType): Promise<CreateOrderResult> {
  const { data, error } = await supabase.functions.invoke('create-order', {
    body: payload,
  })

  if (error) throw new Error(error.message)

  if (!data?.order_id || !data?.order_number) {
    throw new Error('Respuesta inválida del servidor')
  }

  return data as CreateOrderResult
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: (payload: OrderCreateType) => {
      const validated = OrderCreateSchema.parse(payload)
      return createOrder(validated)
    },
  })
}
