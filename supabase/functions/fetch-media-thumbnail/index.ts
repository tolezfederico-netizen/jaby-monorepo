import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Provider = 'tiktok' | 'instagram'

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeTikTokUrl(url: string): { url: string; videoId: string } | null {
  const match = url.match(/video\/(\d+)/)
  if (!match) return null

  const videoId = match[1]
  try {
    const pathParts = new URL(url).pathname.split('/').filter(Boolean)
    const videoIndex = pathParts.findIndex((part) => part.toLowerCase() === 'video')
    const usernamePart = videoIndex > 0 ? pathParts[videoIndex - 1] : null
    const username = usernamePart?.startsWith('@') ? usernamePart.slice(1) : 'user'
    return {
      url: `https://www.tiktok.com/@${encodeURIComponent(username || 'user')}/video/${videoId}`,
      videoId,
    }
  } catch {
    return { url: `https://www.tiktok.com/@user/video/${videoId}`, videoId }
  }
}

async function fetchWithTimeout(input: string, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'AntojosExpressMediaThumbnail/1.0' },
    })
  } finally {
    clearTimeout(timeout)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Metodo no permitido' }, 405)

  // Solo usuarios logueados del admin: la funcion escribe en Storage con la service role
  const authHeader = req.headers.get('Authorization') ?? ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userError } = await authClient.auth.getUser()
  if (userError || !userData?.user) {
    return jsonResponse({ error: 'No autorizado' }, 401)
  }

  try {
    let body: { url?: unknown; provider?: unknown }
    try {
      body = await req.json()
    } catch (error) {
      console.error('[fetch-media-thumbnail] JSON invalido', { error })
      return jsonResponse({ error: 'El body debe ser JSON valido' }, 400)
    }

    const url = typeof body.url === 'string' ? body.url.trim() : ''
    const provider = body.provider as Provider
    if (!url || (provider !== 'tiktok' && provider !== 'instagram')) {
      return jsonResponse({ error: 'Se requiere url y provider valido' }, 400)
    }
    if (provider === 'instagram') {
      return jsonResponse({ error: 'Instagram no soporta thumbnail automatico' }, 400)
    }

    const normalized = normalizeTikTokUrl(url)
    if (!normalized) {
      console.error('[fetch-media-thumbnail] No se pudo extraer el ID de TikTok', { url })
      return jsonResponse({ error: 'No se pudo extraer el ID del video de TikTok' }, 400)
    }

    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(normalized.url)}`
    let oembedResponse: Response
    try {
      oembedResponse = await fetchWithTimeout(oembedUrl)
    } catch (error) {
      console.error('[fetch-media-thumbnail] Error de red o timeout en oEmbed', { url, normalizedUrl: normalized.url, oembedUrl, error })
      return jsonResponse({ error: 'TikTok no respondio a tiempo o no esta disponible' }, 502)
    }

    if (!oembedResponse.ok) {
      const responseBody = await oembedResponse.text().catch(() => '')
      console.error('[fetch-media-thumbnail] TikTok oEmbed devolvio un status invalido', {
        url,
        normalizedUrl: normalized.url,
        status: oembedResponse.status,
        statusText: oembedResponse.statusText,
        responseBody,
      })
      return jsonResponse({ error: `TikTok oEmbed devolvio HTTP ${oembedResponse.status}` }, 502)
    }

    let oembed: { thumbnail_url?: unknown }
    try {
      oembed = await oembedResponse.json()
    } catch (error) {
      console.error('[fetch-media-thumbnail] Respuesta oEmbed no valida como JSON', { url, normalizedUrl: normalized.url, error })
      return jsonResponse({ error: 'TikTok devolvio una respuesta JSON invalida' }, 502)
    }

    const thumbnailUrl = typeof oembed.thumbnail_url === 'string' ? oembed.thumbnail_url : ''
    if (!thumbnailUrl) {
      console.error('[fetch-media-thumbnail] oEmbed no contiene thumbnail_url', { url, normalizedUrl: normalized.url, oembed })
      return jsonResponse({ error: 'TikTok no devolvio thumbnail_url' }, 502)
    }

    let imageResponse: Response
    try {
      imageResponse = await fetchWithTimeout(thumbnailUrl)
    } catch (error) {
      console.error('[fetch-media-thumbnail] Error de red o timeout descargando thumbnail', { url, thumbnailUrl, error })
      return jsonResponse({ error: 'No se pudo descargar el thumbnail de TikTok' }, 502)
    }
    if (!imageResponse.ok) {
      const responseBody = await imageResponse.text().catch(() => '')
      console.error('[fetch-media-thumbnail] Thumbnail devolvio un status invalido', {
        url,
        thumbnailUrl,
        status: imageResponse.status,
        statusText: imageResponse.statusText,
        responseBody,
      })
      return jsonResponse({ error: `El thumbnail devolvio HTTP ${imageResponse.status}` }, 502)
    }

    const imageBlob = await imageResponse.blob()
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[fetch-media-thumbnail] Faltan variables de Supabase')
      return jsonResponse({ error: 'La funcion no esta configurada correctamente' }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    // Mismo nombre que usa la carga manual del admin, para que el borrado lo encuentre
    const path = `tiktok-${normalized.videoId}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('media-thumbnails')
      .upload(path, imageBlob, { upsert: true, contentType: 'image/jpeg' })
    if (uploadError) {
      console.error('[fetch-media-thumbnail] Error subiendo thumbnail a Storage', { url, path, error: uploadError })
      return jsonResponse({ error: 'No se pudo guardar el thumbnail en Storage' }, 500)
    }

    const { data: publicData } = supabase.storage.from('media-thumbnails').getPublicUrl(path)
    if (!publicData.publicUrl) {
      console.error('[fetch-media-thumbnail] Storage no devolvio URL publica', { url, path })
      return jsonResponse({ error: 'No se pudo obtener la URL publica del thumbnail' }, 500)
    }

    // ?v= evita que el navegador/CDN siga mostrando una version anterior del mismo archivo
    return jsonResponse({ thumbnail_url: `${publicData.publicUrl}?v=${Date.now()}` }, 200)
  } catch (error) {
    console.error('[fetch-media-thumbnail] Error inesperado', { error })
    return jsonResponse({ error: 'Error inesperado al obtener el thumbnail' }, 500)
  }
})
