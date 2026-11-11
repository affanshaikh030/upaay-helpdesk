import axios from 'axios'
import type { TicketCategory, TicketStatus } from '@helpdesk/core'
import { useQuery } from '@tanstack/react-query'

export type Ticket = {
  id: number
  subject: string
  fromName: string
  fromEmail: string
  status: TicketStatus
  category: TicketCategory | null
  createdAt: string
}

export const ticketsQueryKey = ['tickets'] as const

// The API returns tickets newest first
export function useTickets() {
  return useQuery({
    queryKey: ticketsQueryKey,
    queryFn: async ({ signal }) => (await axios.get<Ticket[]>('/api/tickets', { signal })).data,
  })
}
