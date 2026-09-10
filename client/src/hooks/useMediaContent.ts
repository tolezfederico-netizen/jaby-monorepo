import { useQuery } from '@tanstack/react-query'
import { getMediaContent } from '@jaby/shared'

export function useMediaContent() {
  return useQuery({
    queryKey: ['media_content'],
    queryFn: async () => {
      const items = await getMediaContent()
      return items.filter((item) => item.is_active)
    },
  })
}
