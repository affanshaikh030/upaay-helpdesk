import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { ticketsQueryKey } from './use-tickets'

export type Stats = {
  total: number
  open: number
  resolvedByAi: number
  aiResolvedPercent: number
  avgResolutionSeconds: number | null
}

// Lives under the tickets key, so changing a ticket (which invalidates that key) refreshes the dashboard too
export const statsQueryKey = [...ticketsQueryKey, 'stats'] as const

export function useStats() {
  return useQuery({
    queryKey: statsQueryKey,
    queryFn: async ({ signal }) => (await axios.get<Stats>('/api/stats', { signal })).data,
  })
}
