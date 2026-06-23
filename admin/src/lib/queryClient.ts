import { createBaseQueryClient } from '@jaby/shared/lib/queryClient'

export const queryClient = createBaseQueryClient({
  staleTime: 1000 * 60 * 1,
  refetchOnWindowFocus: true,
})
