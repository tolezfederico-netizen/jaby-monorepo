import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createMediaContent,
  deleteMediaContent,
  fetchAutoThumbnail,
  getMediaContent,
  updateMediaContent,
} from '@jaby/shared'
import type { CreateMediaContentPayload, UpdateMediaContentPayload } from '@jaby/shared/lib/media-content'
import type { MediaProvider } from '@jaby/shared'
import { supabase } from '../lib/supabase'

const QUERY_KEY = ['media_content']

export function useMediaContent() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getMediaContent,
  })
}

export function useCreateMediaContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateMediaContentPayload) => {
      const isManual = payload.thumbnail_source === 'manual' && !!payload.thumbnail_url
      const thumbnail_url = isManual
        ? payload.thumbnail_url ?? null
        : payload.provider === 'tiktok'
          ? await fetchAutoThumbnail(payload.url, payload.provider)
          : payload.thumbnail_url ?? null

      const item = await createMediaContent({
        ...payload,
        thumbnail_url,
        thumbnail_source: isManual || payload.provider !== 'tiktok' ? 'manual' : 'auto',
      })
      return {
        item,
        thumbnailWarning: payload.provider === 'tiktok' && !thumbnail_url
          ? 'No se pudo obtener el thumbnail automáticamente desde TikTok. El contenido se guardó sin imagen: editalo y subí una captura del video.'
          : null,
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateMediaContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateMediaContentPayload }) => {
      const isManual = payload.thumbnail_source === 'manual'
      const tryAuto = !isManual && payload.provider === 'tiktok' && !!payload.url
      const thumbnail_url = tryAuto ? await fetchAutoThumbnail(payload.url as string, payload.provider as MediaProvider) : undefined

      // Si el automático falla no se pisa la imagen que ya tuviera cargada
      const item = await updateMediaContent(id, {
        ...payload,
        ...(tryAuto && thumbnail_url ? { thumbnail_url, thumbnail_source: 'auto' as const } : {}),
      })
      return {
        item,
        thumbnailWarning: tryAuto && !thumbnail_url
          ? 'No se pudo obtener el thumbnail automáticamente desde TikTok. Los cambios se guardaron; si falta la imagen, subí una captura del video.'
          : null,
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteMediaContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteMediaContent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const maxWidth = 800
      let { width, height } = image
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('Canvas no disponible'))
        return
      }
      context.drawImage(image, 0, 0, width, height)

      let quality = 0.7
      const attempt = () => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Error al comprimir imagen'))
            return
          }
          if (blob.size <= 45 * 1024 || quality <= 0.1) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }))
            return
          }
          quality -= 0.1
          attempt()
        }, 'image/jpeg', quality)
      }
      attempt()
    }
    image.onerror = () => reject(new Error('Error al cargar imagen'))
    image.src = objectUrl
  })
}

export function useUploadMediaThumbnail() {
  return useMutation({
    mutationFn: async ({ file, provider, externalId }: {
      file: File
      provider: MediaProvider
      externalId: string | null
    }): Promise<string> => {
      const compressed = await compressImage(file)
      const suffix = externalId ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const fileName = `${provider}-${suffix}.jpg`
      const { error } = await supabase.storage
        .from('media-thumbnails')
        .upload(fileName, compressed, { contentType: compressed.type, upsert: true })
      if (error) throw new Error(error.message)

      const { data } = supabase.storage.from('media-thumbnails').getPublicUrl(fileName)
      return data.publicUrl
    },
  })
}
