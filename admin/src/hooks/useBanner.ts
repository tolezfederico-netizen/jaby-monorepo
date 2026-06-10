import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { BannerSchema, BannerUpdateSchema } from '@jaby/shared'
import type { BannerUpdateType } from '@jaby/shared'

async function fetchBanner() {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  return BannerSchema.parse(data)
}

export function useBanner() {
  return useQuery({
    queryKey: ['admin', 'banner'],
    queryFn: fetchBanner,
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateBanner() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: BannerUpdateType) => {
      const validated = BannerUpdateSchema.parse(payload)

      const { data: existing, error: fetchError } = await supabase
        .from('banners')
        .select('id')
        .single()

      if (fetchError || !existing) throw new Error('No se encontró el banner')

      const { data, error } = await supabase
        .from('banners')
        .update(validated)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return BannerSchema.parse(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banner'] })
    },
  })
}

export function useToggleBanner() {
  const queryClient = useQueryClient()
  const { data: banner } = useBanner()

  return useMutation({
    mutationFn: async () => {
      if (!banner) throw new Error('Banner no disponible')

      const { data, error } = await supabase
        .from('banners')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return BannerSchema.parse(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banner'] })
    },
  })
}
