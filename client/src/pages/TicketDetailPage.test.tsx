import axios, { AxiosError, type AxiosResponse } from 'axios'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TicketCategory, TicketStatus } from '@helpdesk/core'
import { renderWithQuery } from '@/test/render'
import type { Assignee, TicketDetail } from '@/hooks/use-tickets'
import TicketDetailPage from './TicketDetailPage'

const ticket: TicketDetail = {
  id: 7,
  subject: 'Refund for the Advanced React course',
  body: 'Please refund me.',
  fromName: 'Jane Student',
  fromEmail: 'jane@example.com',
  messageId: null,
  status: TicketStatus.OPEN,
  category: TicketCategory.REFUND_REQUEST,
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

// Routes GET requests by URL: the ticket, the assignable agents
function mockGets(detail: TicketDetail | AxiosError = ticket) {
  return vi.spyOn(axios, 'get').mockImplementation(async (url: string) => {
    if (url === '/api/tickets/assignees') return { data: agents }
    if (detail instanceof AxiosError) throw detail
    return { data: detail }
  })
}

function renderPage() {
  return renderWithQuery(
    <Routes>
      <Route path="/tickets/:id" element={<TicketDetailPage />} />
    </Routes>,
    ['/tickets/7'],
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TicketDetailPage assignment', () => {
  it('lists unassigned and every agent in the dropdown', async () => {
    mockGets()
    renderPage()

    const select = await screen.findByRole('combobox', { name: 'Assigned to' })
    await screen.findByRole('option', { name: 'Alice Agent' })
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent)
    expect(options).toEqual(['Unassigned', 'Alice Agent', 'Bob Agent'])
    expect(select).toHaveValue('')
  })

  it('preselects the current assignee', async () => {
    mockGets({ ...ticket, assignedTo: agents[1] })
    renderPage()

    const select = await screen.findByRole('combobox', { name: 'Assigned to' })
    await screen.findByRole('option', { name: 'Bob Agent' })
    expect(select).toHaveValue('agent-2')
  })

  it('sends the chosen agent id when assigning', async () => {
    mockGets()
    const patch = vi.spyOn(axios, 'patch').mockResolvedValue({ data: { ...ticket, assignedTo: agents[0] } })
    renderPage()

    const select = await screen.findByRole('combobox', { name: 'Assigned to' })
    await screen.findByRole('option', { name: 'Alice Agent' })
    fireEvent.change(select, { target: { value: 'agent-1' } })

    await waitFor(() => expect(patch).toHaveBeenCalledWith('/api/tickets/7', { assignedToId: 'agent-1' }))
  })

  it('sends null when unassigning', async () => {
    mockGets({ ...ticket, assignedTo: agents[0] })
    const patch = vi.spyOn(axios, 'patch').mockResolvedValue({ data: ticket })
    renderPage()

    const select = await screen.findByRole('combobox', { name: 'Assigned to' })
    await screen.findByRole('option', { name: 'Alice Agent' })
    await waitFor(() => expect(select).toHaveValue('agent-1'))
    fireEvent.change(select, { target: { value: '' } })

    await waitFor(() => expect(patch).toHaveBeenCalledWith('/api/tickets/7', { assignedToId: null }))
  })

  it('refetches the ticket after a successful assignment', async () => {
    const get = mockGets()
    vi.spyOn(axios, 'patch').mockResolvedValue({ data: { ...ticket, assignedTo: agents[0] } })
    renderPage()

    const select = await screen.findByRole('combobox', { name: 'Assigned to' })
    await screen.findByRole('option', { name: 'Alice Agent' })
    const callsBefore = get.mock.calls.filter(([url]) => url === '/api/tickets/7').length
    fireEvent.change(select, { target: { value: 'agent-1' } })

    await waitFor(() =>
      expect(get.mock.calls.filter(([url]) => url === '/api/tickets/7').length).toBeGreaterThan(callsBefore),
    )
  })

  it('shows an error when the update fails', async () => {
    mockGets()
    vi.spyOn(axios, 'patch').mockRejectedValue(httpError(400))
    renderPage()

    const select = await screen.findByRole('combobox', { name: 'Assigned to' })
    await screen.findByRole('option', { name: 'Alice Agent' })
    fireEvent.change(select, { target: { value: 'agent-1' } })

    expect(await screen.findByText('Failed to update assignee')).toBeInTheDocument()
  })

  it('shows not found for a missing ticket', async () => {
    mockGets(httpError(404))
    renderPage()

    expect(await screen.findByText('Ticket not found')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Assigned to' })).not.toBeInTheDocument()
  })
})
