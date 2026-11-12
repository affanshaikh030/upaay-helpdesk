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
export type TicketListParams = TicketSort & Pick<TicketListQuery, 'status' | 'category' | 'search'>

export const defaultTicketSort: TicketSort = { sortBy: 'createdAt', sortOrder: 'desc' }

// Sorting and filtering happen on the server; the previous result stays on screen while a new sort loads
export function useTickets(params: TicketListParams = defaultTicketSort) {
  return useQuery({
    queryKey: [...ticketsQueryKey, params],
    queryFn: async ({ signal }) => (await axios.get<Ticket[]>('/api/tickets', { params, signal })).data,
    placeholderData: keepPreviousData,
  })
}
