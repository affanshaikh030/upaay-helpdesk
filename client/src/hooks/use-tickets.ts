import axios from 'axios'
import type {
  CreateReplyInput,
  PolishReplyInput,
  ReanalyseTicketsInput,
  SenderType,
  TicketCategory,
  TicketListQuery,
  TicketPriority,
  TicketSentiment,
  TicketStatus,
  UpdateTicketInput,
} from '@helpdesk/core'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type Assignee = { id: string; name: string }

export type Ticket = {
  id: number
  subject: string
  fromName: string
  fromEmail: string
  status: TicketStatus
  category: TicketCategory | null
  // Set by AI analysis (null until it has run, and for older tickets); agents can override them
  priority: TicketPriority | null
  sentiment: TicketSentiment | null
  createdAt: string
  assignedTo: Assignee | null
}

export type TicketDetail = Ticket & {
  body: string
  bodyHtml: string | null
  messageId: string | null
  resolvedByAi: boolean
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
export type TicketListParams = TicketSort &
  Partial<Pick<TicketListQuery, 'status' | 'category' | 'priority' | 'sentiment' | 'search' | 'page' | 'pageSize'>>

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

export const assigneesQueryKey = [...ticketsQueryKey, 'assignees'] as const

export function useAssignees() {
  return useQuery({
    queryKey: assigneesQueryKey,
    queryFn: async ({ signal }) => (await axios.get<Assignee[]>('/api/tickets/assignees', { signal })).data,
  })
}

export function useUpdateTicket(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateTicketInput) =>
      (await axios.patch<TicketDetail>(`/api/tickets/${id}`, input)).data,
    // Refetches the list and this ticket's detail (both live under the tickets key)
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketsQueryKey }),
  })
}

export type ReanalyseResult = { queued: number; remaining: number }

// Admin only. Queues the AI analysis again for tickets with no priority or sentiment (up to 10 per call). The jobs run in
// the background, so the lists are refreshed a few seconds later rather than right away
export function useReanalyseTickets() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ReanalyseTicketsInput = {}) =>
      (await axios.post<ReanalyseResult>('/api/tickets/reanalyse', input)).data,
    onSuccess: ({ queued }) => {
      if (queued > 0) setTimeout(() => void queryClient.invalidateQueries({ queryKey: ticketsQueryKey }), 8_000)
    },
  })
}

export type Reply = {
  id: number
  body: string
  senderType: SenderType
  createdAt: string
  author: Assignee | null
}

export function useReplies(ticketId: string | undefined) {
  return useQuery({
    queryKey: [...ticketsQueryKey, 'detail', ticketId, 'replies'],
    queryFn: async ({ signal }) => (await axios.get<Reply[]>(`/api/tickets/${ticketId}/replies`, { signal })).data,
    enabled: ticketId !== undefined,
  })
}

// Asks the server's AI to improve a draft reply; returns the polished text and saves nothing
export function usePolishReply(ticketId: number) {
  return useMutation({
    mutationFn: async (input: PolishReplyInput) =>
      (await axios.post<{ body: string }>(`/api/tickets/${ticketId}/replies/polish`, input)).data,
  })
}

// Asks the server's AI to summarise the ticket and its replies; each call regenerates it and nothing is saved
export function useSummarizeTicket(ticketId: number) {
  return useMutation({
    mutationFn: async () => (await axios.post<{ summary: string }>(`/api/tickets/${ticketId}/summary`)).data,
  })
}

export function useCreateReply(ticketId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateReplyInput) =>
      (await axios.post<Reply>(`/api/tickets/${ticketId}/replies`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketsQueryKey }),
  })
}
