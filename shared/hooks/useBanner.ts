import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { BannerSchema } from '../schemas'

export function createUseBanner(queryKey: string[]) {
  return function useBanner() {
    return useQuery({
      queryKey,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('banners')
          .select('*')
          .eq('is_active', true)
          .single()
        if (error) throw error
        return BannerSchema.parse(data)
      }
    })
  }
}
