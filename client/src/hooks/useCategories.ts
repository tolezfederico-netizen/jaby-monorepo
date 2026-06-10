import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { z } from 'zod'
import { ProductSchema } from '@jaby/shared'

const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  sort_order: z.number(),
})

export type CategoryType = z.infer<typeof CategorySchema>

async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)

  return z.array(CategorySchema).parse(data)
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10,
  })
}
