import axios from 'axios'
import type { CreateUserInput, Role, UpdateUserInput } from '@helpdesk/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type User = {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
}

export const usersQueryKey = ['users'] as const

export function useUsers() {
  return useQuery({
    queryKey: usersQueryKey,
    queryFn: async ({ signal }) => (await axios.get<User[]>('/api/users', { signal })).data,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateUserInput) => (await axios.post<User>('/api/users', input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersQueryKey }),
  })
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateUserInput) => (await axios.patch<User>(`/api/users/${id}`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersQueryKey }),
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/users/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersQueryKey }),
  })
}
