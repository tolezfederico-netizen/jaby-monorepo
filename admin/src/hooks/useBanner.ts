import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { BannerSchema, BannerUpdateSchema } from '@jaby/shared'
import type { BannerUpdateType } from '@jaby/shared'

const QUERY_KEY = ['admin', 'banner']

// A diferencia del hook de la tienda, este trae el banner aunque esté apagado,
// para poder editarlo y volver a activarlo desde el admin.
export function useBanner() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('banners').select('*').limit(1).maybeSingle()

      if (error) throw new Error(error.message)
      return data ? BannerSchema.parse(data) : null
    },
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
        .limit(1)
        .maybeSingle()

      if (fetchError) throw new Error(fetchError.message)

      // Si todavía no existe ninguna fila de banner, se crea
      const query = existing
        ? supabase.from('banners').update(validated).eq('id', existing.id)
        : supabase.from('banners').insert({ is_active: false, ...validated })

      const { data, error } = await query.select().single()

      if (error) throw new Error(error.message)
      return BannerSchema.parse(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
