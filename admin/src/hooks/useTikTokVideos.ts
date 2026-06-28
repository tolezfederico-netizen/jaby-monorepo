import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTikTokVideos,
  createTikTokVideo,
  updateTikTokVideo,
  deleteTikTokVideo,
  fetchTikTokThumbnail,
} from '@jaby/shared'

const QUERY_KEY = ['admin', 'tiktok_videos']

function extractVideoId(url: string): string | null {
  const match = url.match(/video\/(\d+)/)
  return match ? match[1] : null
}

export function useTikTokVideos() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getTikTokVideos,
  })
}

export function useCreateTikTokVideo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { url: string; order: number }) => {
      const videoId = extractVideoId(payload.url) ?? ''
      const thumbnail_url = await fetchTikTokThumbnail(payload.url, videoId)
      return createTikTokVideo({ ...payload, thumbnail_url })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateTikTokVideo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Parameters<typeof updateTikTokVideo>[1] }) => {
      const hasUrl = 'url' in payload && payload.url
      let thumbnail_url: string | undefined
      if (hasUrl) {
        const videoId = extractVideoId(payload.url!) ?? ''
        thumbnail_url = await fetchTikTokThumbnail(payload.url!, videoId) ?? undefined
      }
      return updateTikTokVideo(id, { ...payload, ...(hasUrl ? { thumbnail_url } : {}) })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteTikTokVideo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTikTokVideo(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
