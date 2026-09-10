import { supabase } from './supabase'
import type { MediaContentType, MediaProvider } from '../types'
import { extractExternalId } from './media-providers'

export type CreateMediaContentPayload = {
  provider: MediaProvider
  url: string
  order: number
  is_active?: boolean
  thumbnail_url?: string | null
  thumbnail_source?: 'auto' | 'manual'
}

export type UpdateMediaContentPayload = Partial<Pick<
  MediaContentType,
  'provider' | 'url' | 'order' | 'is_active' | 'thumbnail_url' | 'thumbnail_source'
>>

export async function getMediaContent(): Promise<MediaContentType[]> {
  const { data, error } = await supabase
    .from('media_content')
    .select('*')
    .order('order', { ascending: true })
  if (error) throw error
  return data as MediaContentType[]
}

export async function createMediaContent(payload: CreateMediaContentPayload): Promise<MediaContentType> {
  const { data, error } = await supabase
    .from('media_content')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as MediaContentType
}

export async function updateMediaContent(
  id: string,
  payload: UpdateMediaContentPayload,
): Promise<MediaContentType> {
  const { data, error } = await supabase
    .from('media_content')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as MediaContentType
}

export async function deleteMediaContent(id: string): Promise<void> {
  const { data: record } = await supabase
    .from('media_content')
    .select('provider, url, thumbnail_url')
    .eq('id', id)
    .single()

  if (record?.thumbnail_url) {
    try {
      const thumbnailPath = new URL(record.thumbnail_url).pathname.split('/').pop()
      if (thumbnailPath) {
        await supabase.storage.from('media-thumbnails').remove([thumbnailPath]).catch(() => {})
      }
    } catch {
      // Deleting the database row should not fail because a thumbnail URL is malformed.
    }
  } else if (record?.provider && record.url) {
    const externalId = extractExternalId(record.url, record.provider as MediaProvider)
    if (externalId) await supabase.storage.from('media-thumbnails').remove([`${record.provider}-${externalId}.jpg`]).catch(() => {})
  }

  const { error } = await supabase
    .from('media_content')
    .delete()
    .eq('id', id)
  if (error) throw error
}
