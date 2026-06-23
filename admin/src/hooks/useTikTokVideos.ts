import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTikTokVideos,
  createTikTokVideo,
  updateTikTokVideo,
  deleteTikTokVideo,
} from '@jaby/shared'

const QUERY_KEY = ['tiktok_videos']

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
      let thumbnail_url: string | null = null
      try {
        const oembedRes = await fetch(
          `https://www.tiktok.com/oembed?url=${encodeURIComponent(payload.url)}`
        )
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json()
          thumbnail_url = oembedData.thumbnail_url ?? null
        }
      } catch {
        thumbnail_url = null
      }
      return createTikTokVideo({ ...payload, thumbnail_url })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateTikTokVideo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateTikTokVideo>[1] }) =>
      updateTikTokVideo(id, payload),
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
