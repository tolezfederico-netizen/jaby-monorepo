import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { CategorySchema, CategoryCreateSchema, CategoryUpdateSchema } from '@shared/schemas/category'
import type { CategoryCreateType, CategoryUpdateType, CategoryType } from '@shared/types/index'

async function fetchAllCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return CategorySchema.array().parse(data)
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchAllCategories,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CategoryCreateType) => {
      const validated = CategoryCreateSchema.parse(payload)
      const { data, error } = await supabase
        .from('categories')
        .insert(validated)
        .select()
        .single()

      if (error) throw error
      return CategorySchema.parse(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CategoryUpdateType }) => {
      const validated = CategoryUpdateSchema.parse(payload)
      const { data, error } = await supabase
        .from('categories')
        .update(validated)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return CategorySchema.parse(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}
