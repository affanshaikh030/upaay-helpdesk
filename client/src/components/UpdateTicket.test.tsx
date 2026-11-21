import axios, { AxiosError, type AxiosResponse } from 'axios'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TicketCategory, TicketPriority, TicketSentiment, TicketStatus } from '@helpdesk/core'
import { renderWithQuery } from '@/test/render'
import type { Assignee, TicketDetail } from '@/hooks/use-tickets'
import { UpdateTicket } from './UpdateTicket'

// Stand in for the session: admins see the "Analyse with AI" button, agents do not
const session = vi.hoisted(() => ({ isAdmin: false }))
vi.mock('@/hooks/use-is-admin', () => ({ useIsAdmin: () => session.isAdmin }))

const ticket: TicketDetail = {
  id: 7,
  subject: 'Refund for the Advanced React course',
  body: 'Please refund me.',
  fromName: 'Jane Student',
  fromEmail: 'jane@example.com',
  bodyHtml: null,
  messageId: null,
  resolvedByAi: false,
  status: TicketStatus.OPEN,
  category: TicketCategory.REFUND_REQUEST,
  priority: null,
  sentiment: null,
  createdAt: '2026-11-11T10:30:00.000Z',
  updatedAt: '2026-11-11T10:30:00.000Z',
  assignedTo: null,
}

const agents: Assignee[] = [
  { id: 'agent-1', name: 'Alice Agent' },
  { id: 'agent-2', name: 'Bob Agent' },
]

function httpError(status: number) {
  const response = { status, data: {} } as AxiosResponse
  return new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', undefined, undefined, response)
}

const mockGet = () => vi.spyOn(axios, 'get').mockResolvedValue({ data: agents })

async function renderForm(overrides: Partial<TicketDetail> = {}) {
  renderWithQuery(<UpdateTicket ticket={{ ...ticket, ...overrides }} />)
  await screen.findByRole('option', { name: 'Alice Agent' })
}

afterEach(() => {
  vi.restoreAllMocks()
  session.isAdmin = false
})

describe('UpdateTicket', () => {
  it('requests the assignable agents with an abort signal', async () => {
    const get = mockGet()
    await renderForm()

    expect(get).toHaveBeenCalledWith('/api/tickets/assignees', { signal: expect.any(AbortSignal) })
  })

  it('shows the current status, category and assignee', async () => {
    mockGet()
    await renderForm({ assignedTo: agents[1] })

    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue(TicketStatus.OPEN)
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue(TicketCategory.REFUND_REQUEST)
    expect(screen.getByRole('combobox', { name: 'Assigned to' })).toHaveValue('agent-2')
  })

  it('lists every status, category and agent as options', async () => {
    mockGet()
    await renderForm()

    const labels = (name: string) =>
      Array.from(screen.getByRole('combobox', { name }).querySelectorAll('option')).map((o) => o.textContent)
    expect(labels('Status')).toEqual(['Open', 'Resolved', 'Closed'])
    expect(labels('Category')).toEqual(['Uncategorized', 'General question', 'Technical question', 'Refund request'])
    expect(labels('Assigned to')).toEqual(['Unassigned', 'Alice Agent', 'Bob Agent'])
  })

  it('selects Uncategorized and Unassigned when the ticket has neither', async () => {
    mockGet()
    await renderForm({ category: null, assignedTo: null })

    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: 'Assigned to' })).toHaveValue('')
  })

  it('sends only the status when it changes', async () => {
    mockGet()
    const patch = vi.spyOn(axios, 'patch').mockResolvedValue({ data: ticket })
    await renderForm()

    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: TicketStatus.RESOLVED } })

    await waitFor(() => expect(patch).toHaveBeenCalledWith('/api/tickets/7', { status: TicketStatus.RESOLVED }))
  })

  it('sends the category when it changes, and null when cleared', async () => {
    mockGet()
    const patch = vi.spyOn(axios, 'patch').mockResolvedValue({ data: ticket })
    await renderForm()

    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), {
      target: { value: TicketCategory.GENERAL_QUESTION },
    })
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/api/tickets/7', { category: TicketCategory.GENERAL_QUESTION }),
    )

    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), { target: { value: '' } })
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/api/tickets/7', { category: null }))
  })

  it('sends the assignee id, and null when unassigning', async () => {
    mockGet()
    const patch = vi.spyOn(axios, 'patch').mockResolvedValue({ data: ticket })
    await renderForm({ assignedTo: agents[0] })

    fireEvent.change(screen.getByRole('combobox', { name: 'Assigned to' }), { target: { value: 'agent-2' } })
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/api/tickets/7', { assignedToId: 'agent-2' }))

    fireEvent.change(screen.getByRole('combobox', { name: 'Assigned to' }), { target: { value: '' } })
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/api/tickets/7', { assignedToId: null }))
  })

  describe('priority and sentiment', () => {
    const labels = (name: string) =>
      Array.from(screen.getByRole('combobox', { name }).querySelectorAll('option')).map((o) => o.textContent)

    it('shows "Not set" while the AI has not set them', async () => {
      mockGet()
      await renderForm()

      expect(screen.getByRole('combobox', { name: 'Priority' })).toHaveValue('')
      expect(screen.getByRole('combobox', { name: 'Sentiment' })).toHaveValue('')
      expect(labels('Priority')[0]).toBe('Not set')
      expect(labels('Sentiment')[0]).toBe('Not set')
    })

    it('shows the current priority and sentiment', async () => {
      mockGet()
      await renderForm({ priority: TicketPriority.HIGH, sentiment: TicketSentiment.NEGATIVE })

      expect(screen.getByRole('combobox', { name: 'Priority' })).toHaveValue(TicketPriority.HIGH)
      expect(screen.getByRole('combobox', { name: 'Sentiment' })).toHaveValue(TicketSentiment.NEGATIVE)
    })

    it('lists every priority from low to urgent and every sentiment', async () => {
      mockGet()
      await renderForm()

      expect(labels('Priority')).toEqual(['Not set', 'Low', 'Medium', 'High', 'Urgent'])
      expect(labels('Sentiment')).toEqual(['Not set', 'Positive', 'Neutral', 'Negative'])
    })

    it('sends the priority when an agent overrides it, and null when cleared', async () => {
      mockGet()
      const patch = vi.spyOn(axios, 'patch').mockResolvedValue({ data: ticket })
      await renderForm({ priority: TicketPriority.LOW })

      fireEvent.change(screen.getByRole('combobox', { name: 'Priority' }), { target: { value: TicketPriority.URGENT } })
      await waitFor(() => expect(patch).toHaveBeenCalledWith('/api/tickets/7', { priority: TicketPriority.URGENT }))

      fireEvent.change(screen.getByRole('combobox', { name: 'Priority' }), { target: { value: '' } })
      await waitFor(() => expect(patch).toHaveBeenCalledWith('/api/tickets/7', { priority: null }))
    })

    it('sends the sentiment when an agent overrides it, and null when cleared', async () => {
      mockGet()
      const patch = vi.spyOn(axios, 'patch').mockResolvedValue({ data: ticket })
      await renderForm({ sentiment: TicketSentiment.NEUTRAL })

      fireEvent.change(screen.getByRole('combobox', { name: 'Sentiment' }), {
        target: { value: TicketSentiment.POSITIVE },
      })
      await waitFor(() => expect(patch).toHaveBeenCalledWith('/api/tickets/7', { sentiment: TicketSentiment.POSITIVE }))

      fireEvent.change(screen.getByRole('combobox', { name: 'Sentiment' }), { target: { value: '' } })
      await waitFor(() => expect(patch).toHaveBeenCalledWith('/api/tickets/7', { sentiment: null }))
    })

    it('disables them while an update is pending', async () => {
      mockGet()
      vi.spyOn(axios, 'patch').mockReturnValue(new Promise(() => {}))
      await renderForm()

      fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: TicketStatus.CLOSED } })

      await waitFor(() => expect(screen.getByRole('combobox', { name: 'Priority' })).toBeDisabled())
      expect(screen.getByRole('combobox', { name: 'Sentiment' })).toBeDisabled()
    })
  })

  describe('analyse with AI (admin only)', () => {
    it('is hidden from agents even when the ticket has no priority or sentiment', async () => {
      mockGet()
      await renderForm()

      expect(screen.queryByRole('button', { name: 'Analyse with AI' })).not.toBeInTheDocument()
    })

    it('is hidden from admins once both priority and sentiment are set', async () => {
      session.isAdmin = true
      mockGet()
      await renderForm({ priority: TicketPriority.LOW, sentiment: TicketSentiment.NEUTRAL })

      expect(screen.queryByRole('button', { name: 'Analyse with AI' })).not.toBeInTheDocument()
    })

    it('is shown to admins while either is missing', async () => {
      session.isAdmin = true
      mockGet()
      await renderForm({ priority: TicketPriority.LOW, sentiment: null })

      expect(screen.getByRole('button', { name: 'Analyse with AI' })).toBeInTheDocument()
    })

    it('asks the server to re-analyse just this ticket and says it was queued', async () => {
      session.isAdmin = true
      mockGet()
      const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { queued: 1, remaining: 0 } })
      await renderForm()

      fireEvent.click(screen.getByRole('button', { name: 'Analyse with AI' }))

      await waitFor(() => expect(post).toHaveBeenCalledWith('/api/tickets/reanalyse', { ticketIds: [7] }))
      expect(await screen.findByText('Analysis queued for 1 ticket')).toBeInTheDocument()
    })

    it('says so when there was nothing to queue', async () => {
      session.isAdmin = true
      mockGet()
      vi.spyOn(axios, 'post').mockResolvedValue({ data: { queued: 0, remaining: 1 } })
      await renderForm()

      fireEvent.click(screen.getByRole('button', { name: 'Analyse with AI' }))

      expect(await screen.findByText('Nothing to analyse right now')).toBeInTheDocument()
    })

    it('disables the button while the request is pending', async () => {
      session.isAdmin = true
      mockGet()
      vi.spyOn(axios, 'post').mockReturnValue(new Promise(() => {}))
      await renderForm()

      fireEvent.click(screen.getByRole('button', { name: 'Analyse with AI' }))

      expect(await screen.findByRole('button', { name: 'Starting analysis…' })).toBeDisabled()
    })

    it('shows an error when the server refuses, for example when AI is not configured', async () => {
      session.isAdmin = true
      mockGet()
      vi.spyOn(axios, 'post').mockRejectedValue(httpError(503))
      await renderForm()

      fireEvent.click(screen.getByRole('button', { name: 'Analyse with AI' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not start the analysis')
    })
  })

  it('disables the fields while an update is pending', async () => {
    mockGet()
    vi.spyOn(axios, 'patch').mockReturnValue(new Promise(() => {}))
    await renderForm()

    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: TicketStatus.CLOSED } })

    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Status' })).toBeDisabled())
    expect(screen.getByRole('combobox', { name: 'Category' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Assigned to' })).toBeDisabled()
  })

  it('shows no error before anything fails', async () => {
    mockGet()
    await renderForm()

    expect(screen.queryByText('Failed to update ticket')).not.toBeInTheDocument()
  })

  it('shows "Failed to update ticket" when the update fails', async () => {
    mockGet()
    vi.spyOn(axios, 'patch').mockRejectedValue(httpError(500))
    await renderForm()

    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: TicketStatus.CLOSED } })

    expect(await screen.findByText('Failed to update ticket')).toBeInTheDocument()
  })
})
