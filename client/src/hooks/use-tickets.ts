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

export type TicketDetail = Ticket & {
  body: string
  messageId: string | null
  updatedAt: string
}

export const ticketsQueryKey = ['tickets'] as const

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: [...ticketsQueryKey, 'detail', id],
    queryFn: async ({ signal }) => (await axios.get<TicketDetail>(`/api/tickets/${id}`, { signal })).data,
    enabled: id !== undefined,
  })
}

export type TicketSort = Pick<TicketListQuery, 'sortBy' | 'sortOrder'>
export type TicketListParams = TicketSort & Partial<Pick<TicketListQuery, 'status' | 'category' | 'search' | 'page' | 'pageSize'>>

export type TicketPage = { tickets: Ticket[]; total: number }

export const defaultTicketSort: TicketSort = { sortBy: 'createdAt', sortOrder: 'desc' }

// Sorting, filtering and paging happen on the server; the previous result stays on screen while a new sort loads
export function useTickets(params: TicketListParams = defaultTicketSort) {
  return useQuery({
    queryKey: [...ticketsQueryKey, params],
    queryFn: async ({ signal }) => (await axios.get<TicketPage>('/api/tickets', { params, signal })).data,
    placeholderData: keepPreviousData,
  })
}
