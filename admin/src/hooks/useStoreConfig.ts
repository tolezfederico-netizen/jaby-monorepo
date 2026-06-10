import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { StoreConfigSchema } from '@shared/schemas/config'

async function fetchStoreConfig() {
  const { data, error } = await supabase
    .from('store_config')
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  return StoreConfigSchema.parse(data)
}

export function useStoreConfig() {
  return useQuery({
    queryKey: ['admin', 'store_config'],
    queryFn: fetchStoreConfig,
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateStoreConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data: existing, error: fetchError } = await supabase
        .from('store_config')
        .select('id')
        .single()

      if (fetchError || !existing) throw new Error('No se encontró la configuración')

      const { data, error } = await supabase
        .from('store_config')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return StoreConfigSchema.parse(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'store_config'] })
    },
  })
}

export function useToggleAppActive() {
  const queryClient = useQueryClient()
  const { data: config } = useStoreConfig()

  return useMutation({
    mutationFn: async () => {
      if (!config) throw new Error('Configuración no disponible')

      const { data, error } = await supabase
        .from('store_config')
        .update({ is_app_active: !config.is_app_active })
        .eq('id', config.id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return StoreConfigSchema.parse(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'store_config'] })
    },
  })
}
