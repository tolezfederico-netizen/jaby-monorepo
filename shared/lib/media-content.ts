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

export type UpdateMediaContentPayload = Partial<
  Pick<
    MediaContentType,
    'provider' | 'url' | 'order' | 'is_active' | 'thumbnail_url' | 'thumbnail_source'
  >
>

export async function getMediaContent(): Promise<MediaContentType[]> {
  const { data, error } = await supabase
    .from('media_content')
    .select('*')
    .order('order', { ascending: true })
  if (error) throw error
  return data as MediaContentType[]
}

export async function createMediaContent(
  payload: CreateMediaContentPayload
): Promise<MediaContentType> {
  const { data, error } = await supabase.from('media_content').insert(payload).select().single()
  if (error) throw error
  return data as MediaContentType
}

export async function updateMediaContent(
  id: string,
  payload: UpdateMediaContentPayload
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
  // Primero la fila (confirmando que se borró) y recién después la miniatura:
  // si el borrado falla, el contenido no queda sin imagen
  const { data: deleted, error } = await supabase
    .from('media_content')
    .delete()
    .eq('id', id)
    .select('provider, url, thumbnail_url')
  if (error) throw error
  if (!deleted || deleted.length === 0) {
    throw new Error('No se encontró el registro a eliminar, o no tenés permisos para eliminarlo')
  }

  const record = deleted[0]
  const paths: string[] = []
  if (record.thumbnail_url) {
    try {
      const thumbnailPath = new URL(record.thumbnail_url).pathname.split('/').pop()
      if (thumbnailPath) paths.push(decodeURIComponent(thumbnailPath))
    } catch {
      // Una URL de miniatura mal formada no debe impedir el borrado.
    }
  } else if (record.provider && record.url) {
    const externalId = extractExternalId(record.url, record.provider as MediaProvider)
    // Incluye el nombre viejo que usaba fetch-media-thumbnail ({id}.jpg)
    if (externalId) paths.push(`${record.provider}-${externalId}.jpg`, `${externalId}.jpg`)
  }

  if (paths.length > 0) {
    await supabase.storage
      .from('media-thumbnails')
      .remove(paths)
      .catch(() => {})
  }
}
