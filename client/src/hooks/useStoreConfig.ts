import { useQuery, useQueryClient } from '@tanstack/react-query'
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
          queryClient.invalidateQueries({ queryKey: ['store_config'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return useQuery({
    queryKey: ['store_config'],
    queryFn: fetchStoreConfig,
    staleTime: Infinity,
  })
}
