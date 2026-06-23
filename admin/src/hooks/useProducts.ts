import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { ProductSchema, ProductCreateSchema, ProductUpdateSchema } from '@jaby/shared'
import type { ProductCreateType, ProductUpdateType } from '@jaby/shared'

async function fetchAllProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)

  return ProductSchema.array().parse(data)
}

export function useProducts() {
  return useQuery({
    queryKey: ['admin', 'products'],
    queryFn: fetchAllProducts,
    staleTime: 1000 * 60 * 1,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ProductCreateType) => {
      const validated = ProductCreateSchema.parse(payload)
      const { data, error } = await supabase
        .from('products')
        .insert(validated)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return ProductSchema.parse(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ProductUpdateType }) => {
      const validated = ProductUpdateSchema.parse(payload)
      const { data, error } = await supabase
        .from('products')
        .update(validated)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return ProductSchema.parse(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })
}

async function compressImage(
  file: File,
  options: { maxSizeKb: number; quality: number }
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)

      const MAX_WIDTH = 800
      let { width, height } = img
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width)
        width = MAX_WIDTH
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas no disponible'))
      ctx.drawImage(img, 0, 0, width, height)

      let quality = options.quality
      const attempt = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Error al comprimir imagen'))
            if (blob.size <= options.maxSizeKb * 1024 || quality <= 0.1) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }))
            } else {
              quality -= 0.1
              attempt()
            }
          },
          'image/jpeg',
          quality
        )
      }
      attempt()
    }
    img.onerror = () => reject(new Error('Error al cargar imagen'))
    img.src = url
  })
}

export function useUploadProductImage() {
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const compressed = await compressImage(file, { maxSizeKb: 45, quality: 0.7 })

      const ext = file.name.split('.').pop() ?? 'jpg'
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage
        .from('Productos')
        .upload(fileName, compressed, { contentType: compressed.type, upsert: false })

      if (error) throw new Error(error.message)

      const { data } = supabase.storage.from('Productos').getPublicUrl(fileName)
      return data.publicUrl
    },
  })
}
