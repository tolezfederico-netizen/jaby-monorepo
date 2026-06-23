import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { CategorySchema, type CategoryType } from '@jaby/shared'

async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)

  return CategorySchema.array().parse(data)
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10,
  })
}
