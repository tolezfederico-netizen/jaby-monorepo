import { useQuery } from '@tanstack/react-query'
import { getTikTokVideos } from '@jaby/shared'

export function useTikTokVideos() {
  return useQuery({
    queryKey: ['tiktok_videos'],
    queryFn: getTikTokVideos,
  })
}
