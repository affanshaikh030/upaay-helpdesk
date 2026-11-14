import axios, { AxiosError, type AxiosResponse } from 'axios'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TicketCategory, TicketStatus } from '@helpdesk/core'
import { renderWithQuery } from '@/test/render'
import type { Assignee, TicketDetail } from '@/hooks/use-tickets'
import { UpdateTicket } from './UpdateTicket'

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

const mockGet = () => vi.spyOn(axios, 'get').mockResolvedValue({ data: agents })

async function renderForm(overrides: Partial<TicketDetail> = {}) {
  renderWithQuery(<UpdateTicket ticket={{ ...ticket, ...overrides }} />)
  await screen.findByRole('option', { name: 'Alice Agent' })
}

afterEach(() => {
  vi.restoreAllMocks()
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
