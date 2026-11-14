import axios, { AxiosError, type AxiosResponse } from 'axios'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SenderType } from '@helpdesk/core'
import { renderWithQuery } from '@/test/render'
import type { Reply } from '@/hooks/use-tickets'
import { ReplyThread } from './ReplyThread'

const agentReply: Reply = {
  id: 1,
  body: 'We have processed your refund.',
  senderType: SenderType.AGENT,
  createdAt: '2026-11-12T09:00:00.000Z',
  author: { id: 'agent-1', name: 'Alice Agent' },
}
const customerReply: Reply = {
  id: 2,
  body: 'Thank you!\nMuch appreciated.',
  senderType: SenderType.CUSTOMER,
  createdAt: '2026-11-12T10:00:00.000Z',
  author: null,
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))

const mockGet = () => vi.spyOn(axios, 'get')
const mockPost = () => vi.spyOn(axios, 'post')

function httpError(status: number, data: unknown = {}) {
  const response = { status, data } as AxiosResponse
  return new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', undefined, undefined, response)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ReplyThread', () => {
  describe('loading', () => {
    it('shows skeletons in a status region while the request is pending', () => {
      mockGet().mockReturnValue(new Promise(() => {}))
      renderWithQuery(<ReplyThread ticketId={7} />)

      const status = screen.getByRole('status', { name: 'Loading replies' })
      expect(status.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
    })

    it('shows the heading and form while loading', () => {
      mockGet().mockReturnValue(new Promise(() => {}))
      renderWithQuery(<ReplyThread ticketId={7} />)

      expect(screen.getByRole('heading', { name: 'Replies' })).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Reply' })).toBeInTheDocument()
    })
  })

  describe('request', () => {
    it('requests the replies of the ticket, with an abort signal', async () => {
      const get = mockGet().mockResolvedValue({ data: [] })
      renderWithQuery(<ReplyThread ticketId={7} />)
      await screen.findByText('No replies yet')

      expect(get).toHaveBeenCalledTimes(1)
      expect(get).toHaveBeenCalledWith('/api/tickets/7/replies', { signal: expect.any(AbortSignal) })
    })
  })

  describe('with replies', () => {
    it('renders one item per reply, in the order returned', async () => {
      mockGet().mockResolvedValue({ data: [agentReply, customerReply] })
      renderWithQuery(<ReplyThread ticketId={7} />)

      const items = await screen.findAllByRole('listitem')
      expect(items).toHaveLength(2)
      expect(items[0]).toHaveTextContent('We have processed your refund.')
      expect(items[1]).toHaveTextContent('Thank you! Much appreciated.')
      expect(screen.queryByRole('status', { name: 'Loading replies' })).not.toBeInTheDocument()
    })

    it('shows the agent name and date on an agent reply', async () => {
      mockGet().mockResolvedValue({ data: [agentReply] })
      renderWithQuery(<ReplyThread ticketId={7} />)

      expect(await screen.findByText(`Alice Agent · ${formatDate(agentReply.createdAt)}`)).toBeInTheDocument()
    })

    it('labels a customer reply "Customer"', async () => {
      mockGet().mockResolvedValue({ data: [customerReply] })
      renderWithQuery(<ReplyThread ticketId={7} />)

      expect(await screen.findByText(`Customer · ${formatDate(customerReply.createdAt)}`)).toBeInTheDocument()
    })

    it('labels an agent reply without an author "Former agent"', async () => {
      mockGet().mockResolvedValue({ data: [{ ...agentReply, author: null }] })
      renderWithQuery(<ReplyThread ticketId={7} />)

      expect(await screen.findByText(`Former agent · ${formatDate(agentReply.createdAt)}`)).toBeInTheDocument()
    })

    it('does not show the empty message', async () => {
      mockGet().mockResolvedValue({ data: [agentReply] })
      renderWithQuery(<ReplyThread ticketId={7} />)
      await screen.findByRole('list')

      expect(screen.queryByText('No replies yet')).not.toBeInTheDocument()
    })
  })

  describe('empty', () => {
    it('shows "No replies yet" and no list', async () => {
      mockGet().mockResolvedValue({ data: [] })
      renderWithQuery(<ReplyThread ticketId={7} />)

      expect(await screen.findByText('No replies yet')).toBeInTheDocument()
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
    })
  })

  describe('error', () => {
    it('shows an alert when the request fails, and keeps the form', async () => {
      mockGet().mockRejectedValue(httpError(500))
      renderWithQuery(<ReplyThread ticketId={7} />)

      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load replies')
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
      expect(screen.queryByRole('status', { name: 'Loading replies' })).not.toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Reply' })).toBeInTheDocument()
    })
  })

  describe('reply form', () => {
    it('shows a validation error and sends nothing when the reply is blank', async () => {
      mockGet().mockResolvedValue({ data: [] })
      const post = mockPost()
      renderWithQuery(<ReplyThread ticketId={7} />)
      await screen.findByText('No replies yet')

      fireEvent.change(screen.getByRole('textbox', { name: 'Reply' }), { target: { value: '   ' } })
      fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))

      expect(await screen.findByText('Reply is required')).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Reply' })).toBeInvalid()
      expect(post).not.toHaveBeenCalled()
    })

    it('posts the trimmed reply, clears the field and refetches the thread', async () => {
      const get = mockGet().mockResolvedValue({ data: [] })
      const post = mockPost().mockResolvedValue({ data: agentReply })
      renderWithQuery(<ReplyThread ticketId={7} />)
      await screen.findByText('No replies yet')

      const textbox = screen.getByRole('textbox', { name: 'Reply' })
      fireEvent.change(textbox, { target: { value: '  Hello there  ' } })
      fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))

      await waitFor(() => expect(post).toHaveBeenCalledWith('/api/tickets/7/replies', { body: 'Hello there' }))
      await waitFor(() => expect(textbox).toHaveValue(''))
      await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    })

    it('clears an earlier validation error once a valid reply is submitted', async () => {
      mockGet().mockResolvedValue({ data: [] })
      mockPost().mockResolvedValue({ data: agentReply })
      renderWithQuery(<ReplyThread ticketId={7} />)
      await screen.findByText('No replies yet')

      fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))
      expect(await screen.findByText('Reply is required')).toBeInTheDocument()

      fireEvent.change(screen.getByRole('textbox', { name: 'Reply' }), { target: { value: 'Hi' } })
      fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))

      await waitFor(() => expect(screen.queryByText('Reply is required')).not.toBeInTheDocument())
    })

    it('disables the form and shows "Sending…" while the reply is being sent', async () => {
      mockGet().mockResolvedValue({ data: [] })
      mockPost().mockReturnValue(new Promise(() => {}))
      renderWithQuery(<ReplyThread ticketId={7} />)
      await screen.findByText('No replies yet')

      fireEvent.change(screen.getByRole('textbox', { name: 'Reply' }), { target: { value: 'Hi' } })
      fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))

      expect(await screen.findByRole('button', { name: 'Sending…' })).toBeDisabled()
      expect(screen.getByRole('textbox', { name: 'Reply' })).toBeDisabled()
    })

    it('shows the server error and keeps the text when sending fails', async () => {
      mockGet().mockResolvedValue({ data: [] })
      mockPost().mockRejectedValue(httpError(404, { error: 'Ticket not found' }))
      renderWithQuery(<ReplyThread ticketId={7} />)
      await screen.findByText('No replies yet')

      fireEvent.change(screen.getByRole('textbox', { name: 'Reply' }), { target: { value: 'Hi' } })
      fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))

      expect(await screen.findByText('Ticket not found')).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Reply' })).toHaveValue('Hi')
    })

    it('shows a generic error when the failure has no server message', async () => {
      mockGet().mockResolvedValue({ data: [] })
      mockPost().mockRejectedValue(httpError(500))
      renderWithQuery(<ReplyThread ticketId={7} />)
      await screen.findByText('No replies yet')

      fireEvent.change(screen.getByRole('textbox', { name: 'Reply' }), { target: { value: 'Hi' } })
      fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))

      expect(await screen.findByText('Failed to send reply')).toBeInTheDocument()
    })
  })
})
