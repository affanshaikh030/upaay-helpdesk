import axios from 'axios'
import type { TicketCategory, TicketListQuery, TicketStatus } from '@helpdesk/core'
import { keepPreviousData, useQuery } from '@tanstack/react-query'

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

export type TicketSort = Pick<TicketListQuery, 'sortBy' | 'sortOrder'>

export const defaultTicketSort: TicketSort = { sortBy: 'createdAt', sortOrder: 'desc' }

// Sorting happens on the server; the previous result stays on screen while a new sort loads
export function useTickets(sort: TicketSort = defaultTicketSort) {
  return useQuery({
    queryKey: [...ticketsQueryKey, sort],
    queryFn: async ({ signal }) => (await axios.get<Ticket[]>('/api/tickets', { params: sort, signal })).data,
    placeholderData: keepPreviousData,
  })
}
