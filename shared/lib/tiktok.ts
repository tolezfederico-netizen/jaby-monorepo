import { supabase } from './supabase'
import type { TikTokVideoType } from '../types'

export async function fetchTikTokThumbnail(url: string, videoId: string): Promise<string | null> {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(oembedUrl)}`
    const res = await fetch(proxyUrl)
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.thumbnail_url) return null

    const imgRes = await fetch(data.thumbnail_url)
    if (!imgRes.ok) return null
    const blob = await imgRes.blob()

    const path = `${videoId}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('tiktok-thumbnails')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (uploadError) return null

    const { data: publicData } = supabase.storage
      .from('tiktok-thumbnails')
      .getPublicUrl(path)
    return publicData?.publicUrl ?? null
  } catch {
    return null
  }
}

export async function getTikTokVideos() {
  const { data, error } = await supabase
    .from('tiktok_videos')
    .select('*')
    .order('order', { ascending: true })
  if (error) throw error
  return data as TikTokVideoType[]
}

export async function createTikTokVideo(payload: {
  url: string
  order: number
  thumbnail_url: string | null
}) {
  const { data, error } = await supabase
    .from('tiktok_videos')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as TikTokVideoType
}

export async function updateTikTokVideo(id: string, payload: Partial<Pick<TikTokVideoType, 'url' | 'order' | 'is_active'>>) {
  const { data, error } = await supabase
    .from('tiktok_videos')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as TikTokVideoType
}

export async function deleteTikTokVideo(id: string) {
  const { data: record } = await supabase
    .from('tiktok_videos')
    .select('url')
    .eq('id', id)
    .single()

  if (record?.url) {
    const match = record.url.match(/video\/(\d+)/)
    const videoId = match ? match[1] : null
    if (videoId) {
      await supabase.storage
        .from('tiktok-thumbnails')
        .remove([`${videoId}.jpg`])
        .catch(() => {})
    }
  }

  const { error } = await supabase
    .from('tiktok_videos')
    .delete()
    .eq('id', id)
  if (error) throw error
}
