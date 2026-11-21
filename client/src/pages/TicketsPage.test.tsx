import axios, { AxiosError, type AxiosResponse } from 'axios'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TicketCategory, TicketPriority, TicketSentiment, TicketStatus, UNSET } from '@helpdesk/core'
import { renderWithQuery } from '@/test/render'
import type { Ticket } from '@/hooks/use-tickets'
import TicketsPage from './TicketsPage'

// Stand in for the session: only admins see the "Analyse untagged tickets" button
const session = vi.hoisted(() => ({ isAdmin: false }))
vi.mock('@/hooks/use-is-admin', () => ({ useIsAdmin: () => session.isAdmin }))

const refund: Ticket = {
  id: 3,
  subject: 'Refund for the Advanced React course',
  fromName: 'Jane Student',
  fromEmail: 'jane@example.com',
  status: TicketStatus.OPEN,
  category: TicketCategory.REFUND_REQUEST,
  priority: TicketPriority.HIGH,
  sentiment: TicketSentiment.NEGATIVE,
  createdAt: '2026-11-11T10:30:00.000Z',
  assignedTo: null,
}
const technical: Ticket = {
  id: 2,
  subject: 'Video will not play',
  fromName: 'Sam Learner',
  fromEmail: 'sam@example.com',
  status: TicketStatus.RESOLVED,
  category: TicketCategory.TECHNICAL_QUESTION,
  priority: TicketPriority.MEDIUM,
  sentiment: TicketSentiment.NEUTRAL,
  createdAt: '2026-11-10T09:00:00.000Z',
  assignedTo: null,
}
const uncategorized: Ticket = {
  id: 1,
  subject: 'Hello there',
  fromName: 'Alex Visitor',
  fromEmail: 'alex@example.com',
  status: TicketStatus.CLOSED,
  category: null,
  priority: null,
  sentiment: null,
  createdAt: '2026-11-09T08:15:00.000Z',
  assignedTo: null,
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))

// What GET /api/tickets returns: one page of tickets plus the total number of matches
const ticketPage = (tickets: Ticket[]) => ({ data: { tickets, total: tickets.length } })

const mockGet = () => vi.spyOn(axios, 'get')

function httpError(status: number) {
  const response = { status, data: {} } as AxiosResponse
  return new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', undefined, undefined, response)
}

const dataRows = () => screen.getAllByRole('row').slice(1) // skip the header row

afterEach(() => {
  vi.restoreAllMocks()
  session.isAdmin = false
})

describe('TicketsPage', () => {
  describe('loading', () => {
    it('shows skeletons in a status region while the request is pending', () => {
      mockGet().mockReturnValue(new Promise(() => {}))
      renderWithQuery(<TicketsPage />)

      const status = screen.getByRole('status', { name: 'Loading tickets' })
      expect(status.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('shows the heading and a generic description while loading', () => {
      mockGet().mockReturnValue(new Promise(() => {}))
      renderWithQuery(<TicketsPage />)

      expect(screen.getByRole('heading', { name: 'Tickets' })).toBeInTheDocument()
      expect(screen.getByText('Support requests received by email')).toBeInTheDocument()
    })

    it('replaces the skeletons with the table once loaded', async () => {
      mockGet().mockResolvedValue(ticketPage([refund]))
      renderWithQuery(<TicketsPage />)

      expect(await screen.findByRole('table')).toBeInTheDocument()
      expect(screen.queryByRole('status', { name: 'Loading tickets' })).not.toBeInTheDocument()
    })
  })

  describe('request', () => {
    it('requests /api/tickets once, with an abort signal', async () => {
      const get = mockGet().mockResolvedValue(ticketPage([refund]))
      renderWithQuery(<TicketsPage />)
      await screen.findByRole('table')

      expect(get).toHaveBeenCalledTimes(1)
      expect(get).toHaveBeenCalledWith('/api/tickets', {
        params: expect.objectContaining({ sortBy: 'createdAt', sortOrder: 'desc', page: 1 }),
        signal: expect.any(AbortSignal),
      })
    })
  })

  describe('with tickets', () => {
    it('renders the column headers', async () => {
      mockGet().mockResolvedValue(ticketPage([refund]))
      renderWithQuery(<TicketsPage />)
      await screen.findByRole('table')

      const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
      expect(headers).toEqual(['Subject', 'From', 'Status', 'Priority', 'Sentiment', 'Category', 'Assigned to', 'Created'])
    })

    it('renders one row per ticket with subject, sender, status, category and date', async () => {
      mockGet().mockResolvedValue(ticketPage([refund, technical]))
      renderWithQuery(<TicketsPage />)
      await screen.findByRole('table')

      const rows = dataRows()
      expect(rows).toHaveLength(2)

      const [refundRow, technicalRow] = rows.map((row) => within(row))
      expect(refundRow.getByText('Refund for the Advanced React course')).toBeInTheDocument()
      expect(refundRow.getByText('Jane Student')).toBeInTheDocument()
      expect(refundRow.getByText('jane@example.com')).toBeInTheDocument()
      expect(refundRow.getByText('Open')).toBeInTheDocument()
      expect(refundRow.getByText('Refund request')).toBeInTheDocument()
      expect(refundRow.getByText(formatDate(refund.createdAt))).toBeInTheDocument()

      expect(technicalRow.getByText('Video will not play')).toBeInTheDocument()
      expect(technicalRow.getByText('Sam Learner')).toBeInTheDocument()
      expect(technicalRow.getByText('sam@example.com')).toBeInTheDocument()
      expect(technicalRow.getByText('Resolved')).toBeInTheDocument()
      expect(technicalRow.getByText('Technical question')).toBeInTheDocument()
      expect(technicalRow.getByText(formatDate(technical.createdAt))).toBeInTheDocument()
    })

    it('shows tickets in the order the API returns them (newest first) without re-sorting', async () => {
      mockGet().mockResolvedValue(ticketPage([refund, technical, uncategorized]))
      renderWithQuery(<TicketsPage />)
      await screen.findByRole('table')

      const subjects = dataRows().map((row) => within(row).getAllByRole('cell')[0].textContent)
      expect(subjects).toEqual([refund.subject, technical.subject, uncategorized.subject])
    })

    it('does not re-order what the API returns', async () => {
      // An older ticket first: the page must show the response order, not sort on its own
      mockGet().mockResolvedValue(ticketPage([uncategorized, refund]))
      renderWithQuery(<TicketsPage />)
      await screen.findByRole('table')

      const subjects = dataRows().map((row) => within(row).getAllByRole('cell')[0].textContent)
      expect(subjects).toEqual([uncategorized.subject, refund.subject])
    })

    it('labels each status with a readable name, not the raw enum value', async () => {
      mockGet().mockResolvedValue(ticketPage([refund, technical, uncategorized]))
      renderWithQuery(<TicketsPage />)
      await screen.findByRole('table')

      const [openRow, resolvedRow, closedRow] = dataRows().map((row) => within(row))
      expect(openRow.getByText('Open')).toBeInTheDocument()
      expect(resolvedRow.getByText('Resolved')).toBeInTheDocument()
      expect(closedRow.getByText('Closed')).toBeInTheDocument()
      for (const raw of Object.values(TicketStatus)) {
        expect(screen.queryByText(raw)).not.toBeInTheDocument()
      }
    })

    it('labels each category with a readable name, not the raw enum value', async () => {
      const general: Ticket = { ...refund, id: 4, category: TicketCategory.GENERAL_QUESTION }
      mockGet().mockResolvedValue(ticketPage([general, technical, refund]))
      renderWithQuery(<TicketsPage />)
      await screen.findByRole('table')

      const [generalRow, technicalRow, refundRow] = dataRows().map((row) => within(row))
      expect(generalRow.getByText('General question')).toBeInTheDocument()
      expect(technicalRow.getByText('Technical question')).toBeInTheDocument()
      expect(refundRow.getByText('Refund request')).toBeInTheDocument()
      for (const raw of Object.values(TicketCategory)) {
        expect(screen.queryByText(raw)).not.toBeInTheDocument()
      }
    })

    it('shows "Uncategorized" when a ticket has no category', async () => {
      mockGet().mockResolvedValue(ticketPage([uncategorized]))
      renderWithQuery(<TicketsPage />)
      await screen.findByRole('table')

      expect(within(dataRows()[0]).getByText('Uncategorized')).toBeInTheDocument()
    })

    it('shows a plural count for several tickets', async () => {
      mockGet().mockResolvedValue(ticketPage([refund, technical]))
      renderWithQuery(<TicketsPage />)

      expect(await screen.findByText('2 tickets')).toBeInTheDocument()
    })

    it('shows a singular count for one ticket', async () => {
      mockGet().mockResolvedValue(ticketPage([refund]))
      renderWithQuery(<TicketsPage />)

      expect(await screen.findByText('1 ticket')).toBeInTheDocument()
      expect(screen.queryByText(/1 tickets/)).not.toBeInTheDocument()
    })
  })

  describe('priority and sentiment', () => {
    const lastParams = (get: ReturnType<typeof mockGet>) =>
      get.mock.lastCall?.[1]?.params as Record<string, unknown> | undefined

    it('shows each ticket\'s priority and sentiment, and "Not set" when the AI has not set them', async () => {
      mockGet().mockResolvedValue(ticketPage([refund, technical, uncategorized]))
      renderWithQuery(<TicketsPage />)
      await screen.findByRole('table')

      const [refundRow, technicalRow, untaggedRow] = dataRows().map((row) => within(row))
      expect(refundRow.getByText('High')).toBeInTheDocument()
      expect(refundRow.getByText('Negative')).toBeInTheDocument()
      expect(technicalRow.getByText('Medium')).toBeInTheDocument()
      expect(technicalRow.getByText('Neutral')).toBeInTheDocument()
      expect(untaggedRow.getAllByText('Not set')).toHaveLength(2)
      for (const raw of [...Object.values(TicketPriority), ...Object.values(TicketSentiment)]) {
        expect(screen.queryByText(raw)).not.toBeInTheDocument()
      }
    })

    it('has a priority and a sentiment filter listing every value, plus "Not set"', async () => {
      mockGet().mockResolvedValue(ticketPage([refund]))
      renderWithQuery(<TicketsPage />)
      await screen.findByRole('table')

      const options = (name: string) =>
        Array.from(screen.getByRole('combobox', { name }).querySelectorAll('option')).map((o) => o.textContent)
      expect(options('Priority')).toEqual(['All priorities', 'Low', 'Medium', 'High', 'Urgent', 'Not set'])
      expect(options('Sentiment')).toEqual(['All sentiments', 'Positive', 'Neutral', 'Negative', 'Not set'])
    })

    it('does not filter by default', async () => {
      const get = mockGet().mockResolvedValue(ticketPage([refund]))
      renderWithQuery(<TicketsPage />)
      await screen.findByRole('table')

      // undefined params are dropped by axios, so nothing is sent to the server
      expect(lastParams(get)?.priority).toBeUndefined()
      expect(lastParams(get)?.sentiment).toBeUndefined()
    })

    it('asks the server for tickets with the chosen priority, from page 1', async () => {
      const get = mockGet().mockResolvedValue(ticketPage([refund]))
      renderWithQuery(<TicketsPage />)
      await screen.findByRole('table')

      fireEvent.change(screen.getByRole('combobox', { name: 'Priority' }), { target: { value: TicketPriority.URGENT } })

      await waitFor(() => expect(lastParams(get)).toMatchObject({ priority: TicketPriority.URGENT, page: 1 }))
    })

    it('asks the server for tickets with the chosen sentiment', async () => {
      const get = mockGet().mockResolvedValue(ticketPage([refund]))
      renderWithQuery(<TicketsPage />)
      await screen.findByRole('table')

      fireEvent.change(screen.getByRole('combobox', { name: 'Sentiment' }), { target: { value: TicketSentiment.NEGATIVE } })

      await waitFor(() => expect(lastParams(get)).toMatchObject({ sentiment: TicketSentiment.NEGATIVE, page: 1 }))
    })

    it('filters for tickets that have no priority or sentiment yet', async () => {
      const get = mockGet().mockResolvedValue(ticketPage([uncategorized]))
      renderWithQuery(<TicketsPage />)
      await screen.findByRole('table')

      fireEvent.change(screen.getByRole('combobox', { name: 'Priority' }), { target: { value: UNSET } })
      await waitFor(() => expect(lastParams(get)).toMatchObject({ priority: UNSET }))

      fireEvent.change(screen.getByRole('combobox', { name: 'Sentiment' }), { target: { value: UNSET } })
      await waitFor(() => expect(lastParams(get)).toMatchObject({ priority: UNSET, sentiment: UNSET }))
    })

    it('says no tickets match when a priority filter finds nothing', async () => {
      mockGet().mockResolvedValueOnce(ticketPage([refund])).mockResolvedValue(ticketPage([]))
      renderWithQuery(<TicketsPage />)
      await screen.findByRole('table')

      fireEvent.change(screen.getByRole('combobox', { name: 'Priority' }), { target: { value: TicketPriority.URGENT } })

      expect(await screen.findByText('No tickets match your filters.')).toBeInTheDocument()
    })

    it('sorts by priority and by sentiment from the column headers', async () => {
      const get = mockGet().mockResolvedValue(ticketPage([refund]))
      renderWithQuery(<TicketsPage />)
      await screen.findByRole('table')

      fireEvent.click(screen.getByRole('button', { name: 'Priority' }))
      await waitFor(() => expect(lastParams(get)).toMatchObject({ sortBy: 'priority', page: 1 }))

      fireEvent.click(screen.getByRole('button', { name: 'Sentiment' }))
      await waitFor(() => expect(lastParams(get)).toMatchObject({ sortBy: 'sentiment', page: 1 }))
    })
  })

  describe('analyse untagged tickets (admin only)', () => {
    it('is hidden from agents', async () => {
      mockGet().mockResolvedValue(ticketPage([uncategorized]))
      renderWithQuery(<TicketsPage />)
      await screen.findByRole('table')

      expect(screen.queryByRole('button', { name: 'Analyse untagged tickets' })).not.toBeInTheDocument()
    })

    it('asks the server to queue the untagged tickets and reports how many', async () => {
      session.isAdmin = true
      mockGet().mockResolvedValue(ticketPage([uncategorized]))
      const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { queued: 3, remaining: 0 } })
      renderWithQuery(<TicketsPage />)
      await screen.findByRole('table')

      fireEvent.click(screen.getByRole('button', { name: 'Analyse untagged tickets' }))

      await waitFor(() => expect(post).toHaveBeenCalledWith('/api/tickets/reanalyse', {}))
      expect(await screen.findByText('Analysis queued for 3 tickets')).toBeInTheDocument()
    })

    it('shows an error when the server refuses', async () => {
      session.isAdmin = true
      mockGet().mockResolvedValue(ticketPage([uncategorized]))
      vi.spyOn(axios, 'post').mockRejectedValue(httpError(503))
      renderWithQuery(<TicketsPage />)
      await screen.findByRole('table')

      fireEvent.click(screen.getByRole('button', { name: 'Analyse untagged tickets' }))

      expect(await screen.findByText('Could not start the analysis')).toBeInTheDocument()
    })
  })

  describe('empty list', () => {
    it('shows an empty state instead of a table', async () => {
      mockGet().mockResolvedValue(ticketPage([]))
      renderWithQuery(<TicketsPage />)

      expect(await screen.findByText('No tickets yet.')).toBeInTheDocument()
      expect(screen.getByText('0 tickets')).toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
  })

  describe('errors', () => {
    it('shows a generic message when the request fails with a server error', async () => {
      mockGet().mockRejectedValue(httpError(500))
      renderWithQuery(<TicketsPage />)

      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load tickets')
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
      expect(screen.queryByRole('status', { name: 'Loading tickets' })).not.toBeInTheDocument()
    })

    it('shows the same message for a 401 (the page has no admin-only message)', async () => {
      mockGet().mockRejectedValue(httpError(401))
      renderWithQuery(<TicketsPage />)

      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load tickets')
    })

    it('shows a generic message on a network error', async () => {
      mockGet().mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
      renderWithQuery(<TicketsPage />)

      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load tickets')
    })

    it('does not retry a failed request', async () => {
      const get = mockGet().mockRejectedValue(httpError(500))
      renderWithQuery(<TicketsPage />)
      await screen.findByRole('alert')

      expect(get).toHaveBeenCalledTimes(1)
    })
  })
})
