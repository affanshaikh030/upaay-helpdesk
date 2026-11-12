import axios, { AxiosError, type AxiosResponse } from 'axios'
import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TicketCategory, TicketStatus } from '@helpdesk/core'
import { renderWithQuery } from '@/test/render'
import type { Ticket } from '@/hooks/use-tickets'
import TicketsPage from './TicketsPage'

const refund: Ticket = {
  id: 3,
  subject: 'Refund for the Advanced React course',
  fromName: 'Jane Student',
  fromEmail: 'jane@example.com',
  status: TicketStatus.OPEN,
  category: TicketCategory.REFUND_REQUEST,
  createdAt: '2026-11-11T10:30:00.000Z',
}
const technical: Ticket = {
  id: 2,
  subject: 'Video will not play',
  fromName: 'Sam Learner',
  fromEmail: 'sam@example.com',
  status: TicketStatus.RESOLVED,
  category: TicketCategory.TECHNICAL_QUESTION,
  createdAt: '2026-11-10T09:00:00.000Z',
}
const uncategorized: Ticket = {
  id: 1,
  subject: 'Hello there',
  fromName: 'Alex Visitor',
  fromEmail: 'alex@example.com',
  status: TicketStatus.CLOSED,
  category: null,
  createdAt: '2026-11-09T08:15:00.000Z',
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
      expect(headers).toEqual(['Subject', 'From', 'Status', 'Category', 'Created'])
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

    it('shows a plural count with the sort order for several tickets', async () => {
      mockGet().mockResolvedValue(ticketPage([refund, technical]))
      renderWithQuery(<TicketsPage />)

      expect(await screen.findByText('2 tickets, newest first')).toBeInTheDocument()
    })

    it('shows a singular count for one ticket', async () => {
      mockGet().mockResolvedValue(ticketPage([refund]))
      renderWithQuery(<TicketsPage />)

      expect(await screen.findByText('1 ticket, newest first')).toBeInTheDocument()
      expect(screen.queryByText(/1 tickets/)).not.toBeInTheDocument()
    })
  })

  describe('empty list', () => {
    it('shows an empty state instead of a table', async () => {
      mockGet().mockResolvedValue(ticketPage([]))
      renderWithQuery(<TicketsPage />)

      expect(await screen.findByText('No tickets yet.')).toBeInTheDocument()
      expect(screen.getByText('0 tickets, newest first')).toBeInTheDocument()
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
