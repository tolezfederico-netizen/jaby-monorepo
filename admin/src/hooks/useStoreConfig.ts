import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { StoreConfigSchema } from '@jaby/shared'

async function fetchStoreConfig() {
  const { data, error } = await supabase
    .from('store_config')
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  return StoreConfigSchema.parse(data)
}

export function useStoreConfig() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channelName = `db-store-config-${crypto.randomUUID()}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_config' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin', 'store_config'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return useQuery({
    queryKey: ['admin', 'store_config'],
    queryFn: fetchStoreConfig,
    staleTime: Infinity,
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
