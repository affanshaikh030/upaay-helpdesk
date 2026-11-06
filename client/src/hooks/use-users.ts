import axios from 'axios'
import { useQuery } from '@tanstack/react-query'

export type User = {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'AGENT'
  createdAt: string
}

export const usersQueryKey = ['users'] as const

export function useUsers() {
  return useQuery({
    queryKey: usersQueryKey,
    queryFn: async ({ signal }) => (await axios.get<User[]>('/api/users', { signal })).data,
  })
}
