import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { ProductSchema, ProductCreateSchema, ProductUpdateSchema } from '@jaby/shared'
import type { ProductCreateType, ProductUpdateType } from '@jaby/shared'
import { compressImage } from '../lib/compressImage'

const PRODUCTS_QUERY_KEY = ['admin', 'products']

async function fetchLongOutOfStockProductCount() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('is_out_of_stock', true)
    .lt('out_of_stock_since', cutoff)

  if (error) throw new Error(error.message)
  return count ?? 0
}

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
    queryKey: PRODUCTS_QUERY_KEY,
    queryFn: fetchAllProducts,
    staleTime: 1000 * 60 * 1,
  })
}

export function useLongOutOfStockProductCount() {
  return useQuery({
    queryKey: ['admin', 'products', 'long-out-of-stock-count'],
    queryFn: fetchLongOutOfStockProductCount,
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
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY })
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
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .select()

      if (error) throw new Error(error.message)
      if (!data || data.length === 0) {
        throw new Error('No se encontró el registro a eliminar, o no tenés permisos para eliminarlo')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY })
    },
  })
}

export function useUploadProductImage() {
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const compressed = await compressImage(file, { maxSizeKb: 45, quality: 0.7 })

      // compressImage siempre devuelve JPEG
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`

      const { error } = await supabase.storage
        .from('Productos')
        .upload(fileName, compressed, { contentType: compressed.type, upsert: false })

      if (error) throw new Error(error.message)

      const { data } = supabase.storage.from('Productos').getPublicUrl(fileName)
      return data.publicUrl
    },
  })
}
