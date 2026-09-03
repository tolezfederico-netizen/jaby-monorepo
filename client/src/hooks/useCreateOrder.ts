import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { OrderCreateSchema } from '@jaby/shared'
import type { OrderCreateType } from '@jaby/shared'

interface CreateOrderResult {
  order_id: string
  order_number: number
}

async function createOrder(payload: OrderCreateType): Promise<CreateOrderResult> {
  const { data, error } = await supabase.functions.invoke('create-order', {
    body: payload,
  })

  if (error) {
    let message = error.message
    try {
      const context = await error.context?.json?.()
      if (context?.error) message = context.error
    } catch {
      // Usar el mensaje genérico si no se puede parsear la respuesta
    }
    throw new Error(message)
  }

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
