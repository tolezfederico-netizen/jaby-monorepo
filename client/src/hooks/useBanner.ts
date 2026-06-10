import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { BannerSchema } from '@shared/schemas/banner'

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
    queryKey: ['banner'],
    queryFn: fetchBanner,
    staleTime: 1000 * 60 * 5,
  })
}
