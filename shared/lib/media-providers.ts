import type { MediaProvider } from '../types'
import { supabase } from './supabase'

function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLocaleLowerCase()
  } catch {
    return null
  }
}

export function detectProvider(url: string): MediaProvider | null {
  const hostname = getHostname(url)
  if (!hostname) return null

  if (hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com')) {
    return 'tiktok'
  }
  if (hostname === 'instagram.com' || hostname.endsWith('.instagram.com')) {
    return 'instagram'
  }
  return null
}

export function extractExternalId(url: string, provider: MediaProvider): string | null {
  if (provider === 'tiktok') {
    const match = url.match(/video\/(\d+)/)
    return match ? match[1] : null
  }

  try {
    const pathParts = new URL(url).pathname.split('/').filter(Boolean)
    const contentType = pathParts[0]?.toLocaleLowerCase()
    if (contentType !== 'reel' && contentType !== 'reels') return null
    return pathParts[1] ? decodeURIComponent(pathParts[1]) : null
  } catch {
    return null
  }
}

export function normalizeTikTokUrl(url: string): string | null {
  const videoId = extractExternalId(url, 'tiktok')
  if (!videoId) return null

  try {
    const pathParts = new URL(url).pathname.split('/').filter(Boolean)
    const videoIndex = pathParts.findIndex((part) => part.toLocaleLowerCase() === 'video')
    const usernamePart = videoIndex > 0 ? pathParts[videoIndex - 1] : null
    const username = usernamePart?.startsWith('@') ? usernamePart.slice(1) : 'user'
    const safeUsername = username || 'user'

    return `https://www.tiktok.com/@${encodeURIComponent(safeUsername)}/video/${videoId}`
  } catch {
    return `https://www.tiktok.com/@user/video/${videoId}`
  }
}

export function getEmbedUrl(url: string, provider: MediaProvider): string | null {
  const externalId = extractExternalId(url, provider)
  if (!externalId) return null

  if (provider === 'tiktok') {
    return `https://www.tiktok.com/embed/v2/${externalId}`
  }
  return `https://www.instagram.com/reel/${externalId}/embed`
}

export async function fetchAutoThumbnail(
  url: string,
  provider: MediaProvider,
  externalId?: string,
): Promise<string | null> {
  if (provider !== 'tiktok') return null

  const videoId = externalId ?? extractExternalId(url, provider)
  if (!videoId) return null
  const normalizedUrl = normalizeTikTokUrl(url) ?? `https://www.tiktok.com/@user/video/${videoId}`
  try {
    const { data, error } = await supabase.functions.invoke('fetch-media-thumbnail', {
      body: { url, provider },
    })
    if (error) {
      console.error('[fetchAutoThumbnail] La Edge Function devolvio un error.', { url, normalizedUrl, videoId, error })
      return null
    }
    if (!data?.thumbnail_url || typeof data.thumbnail_url !== 'string') {
      console.error('[fetchAutoThumbnail] La Edge Function no devolvio thumbnail_url.', { url, normalizedUrl, videoId, data })
      return null
    }
    return data.thumbnail_url
  } catch (error) {
    console.error('[fetchAutoThumbnail] Error inesperado para TikTok.', { url, normalizedUrl, videoId, error })
    return null
  }
}
