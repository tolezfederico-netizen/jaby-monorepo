import { QueryClient } from '@tanstack/react-query'

export function createBaseQueryClient(overrides = {}) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        ...overrides
      }
    }
  })
}
