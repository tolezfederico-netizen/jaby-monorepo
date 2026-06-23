import { supabase } from './supabase'
import type { TikTokVideoType } from '../types'

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
  const { error } = await supabase
    .from('tiktok_videos')
    .delete()
    .eq('id', id)
  if (error) throw error
}
