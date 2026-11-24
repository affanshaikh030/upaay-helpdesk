import axios, { AxiosError, type AxiosResponse } from 'axios'
import { act, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SenderType } from '@helpdesk/core'
import { renderWithQuery } from '@/test/render'
import type { Reply } from '@/hooks/use-tickets'
import { useLanguage } from '@/i18n/use-language'
import { ReplyThread } from './ReplyThread'

const agentReply: Reply = {
  id: 1,
  body: 'We have processed your refund.',
  senderType: SenderType.AGENT,
  createdAt: '2026-11-12T09:00:00.000Z',
  author: { id: 'agent-1', name: 'Alice Agent' },
  sourceArticle: null,
}
// An answer the AI wrote from the knowledge base: no author, and the article it was based on
const aiReply: Reply = {
  id: 3,
  body: 'Yes, a certificate is issued when you complete the course.',
  senderType: SenderType.AGENT,
  createdAt: '2026-11-12T11:00:00.000Z',
  author: null,
  sourceArticle: { id: 4, title: 'Certificates' },
}
const customerReply: Reply = {
  id: 2,
  body: 'Thank you!\nMuch appreciated.',
  senderType: SenderType.CUSTOMER,
  createdAt: '2026-11-12T10:00:00.000Z',
  author: null,
  sourceArticle: null,
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

const ticket = { id: 7, subject: 'Refund', fromName: 'Ada Lovelace', body: 'Please refund me.', resolvedByAi: false }

describe('ReplyThread', () => {
  describe('loading', () => {
    it('shows skeletons in a status region while the request is pending', () => {
      mockGet().mockReturnValue(new Promise(() => {}))
      renderWithQuery(<ReplyThread ticket={ticket} />)

      const status = screen.getByRole('status', { name: 'Loading replies' })
      expect(status.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
    })

    it('shows the heading and form while loading', () => {
      mockGet().mockReturnValue(new Promise(() => {}))
      renderWithQuery(<ReplyThread ticket={ticket} />)

      expect(screen.getByRole('heading', { name: 'Replies' })).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Reply' })).toBeInTheDocument()
    })
  })

  describe('request', () => {
    it('requests the replies of the ticket, with an abort signal', async () => {
      const get = mockGet().mockResolvedValue({ data: [] })
      renderWithQuery(<ReplyThread ticket={ticket} />)
      await screen.findByText('No replies yet')

      // The suggested reply is a separate request (see the suggested reply tests)
      const replyCalls = get.mock.calls.filter(([url]) => url === '/api/tickets/7/replies')
      expect(replyCalls).toHaveLength(1)
      expect(replyCalls[0]).toEqual(['/api/tickets/7/replies', { signal: expect.any(AbortSignal) }])
    })
  })

  describe('with replies', () => {
    it('renders one item per reply, in the order returned', async () => {
      mockGet().mockResolvedValue({ data: [agentReply, customerReply] })
      renderWithQuery(<ReplyThread ticket={ticket} />)

      const items = await screen.findAllByRole('listitem')
      expect(items).toHaveLength(2)
      expect(items[0]).toHaveTextContent('We have processed your refund.')
      expect(items[1]).toHaveTextContent('Thank you! Much appreciated.')
      expect(screen.queryByRole('status', { name: 'Loading replies' })).not.toBeInTheDocument()
    })

    it('shows the agent name and date on an agent reply', async () => {
      mockGet().mockResolvedValue({ data: [agentReply] })
      renderWithQuery(<ReplyThread ticket={ticket} />)

      expect(await screen.findByText(`Alice Agent · ${formatDate(agentReply.createdAt)}`)).toBeInTheDocument()
    })

    it('labels a customer reply "Customer"', async () => {
      mockGet().mockResolvedValue({ data: [customerReply] })
      renderWithQuery(<ReplyThread ticket={ticket} />)

      expect(await screen.findByText(`Customer · ${formatDate(customerReply.createdAt)}`)).toBeInTheDocument()
    })

    it('labels an agent reply without an author "Former agent"', async () => {
      mockGet().mockResolvedValue({ data: [{ ...agentReply, author: null }] })
      renderWithQuery(<ReplyThread ticket={ticket} />)

      expect(await screen.findByText(`Former agent · ${formatDate(agentReply.createdAt)}`)).toBeInTheDocument()
    })

    describe('Based on line', () => {
      const aiTicket = { ...ticket, resolvedByAi: true }

      it('shows the source article title under an AI reply, inside that reply', async () => {
        mockGet().mockResolvedValue({ data: [aiReply] })
        renderWithQuery(<ReplyThread ticket={aiTicket} />)

        const item = await screen.findByRole('listitem')
        expect(item).toHaveTextContent('Yes, a certificate is issued when you complete the course.')
        expect(within(item).getByText('Based on: Certificates')).toBeInTheDocument()
        expect(item).toHaveTextContent(`AI assistant · ${formatDate(aiReply.createdAt)}`)
      })

      it('comes after the reply text', async () => {
        mockGet().mockResolvedValue({ data: [aiReply] })
        renderWithQuery(<ReplyThread ticket={aiTicket} />)

        const item = await screen.findByRole('listitem')
        const text = item.textContent ?? ''
        expect(text.indexOf('Based on:')).toBeGreaterThan(text.indexOf('when you complete the course.'))
      })

      it('shows nothing on a human reply or a customer reply', async () => {
        mockGet().mockResolvedValue({ data: [agentReply, customerReply] })
        renderWithQuery(<ReplyThread ticket={ticket} />)
        await screen.findAllByRole('listitem')

        expect(screen.queryByText(/Based on/)).not.toBeInTheDocument()
      })

      it('shows nothing when the article was deleted, and no empty label or link either', async () => {
        mockGet().mockResolvedValue({ data: [{ ...aiReply, sourceArticle: null }] })
        renderWithQuery(<ReplyThread ticket={aiTicket} />)

        const item = await screen.findByRole('listitem')
        expect(item).toHaveTextContent('Yes, a certificate is issued when you complete the course.')
        expect(screen.queryByText(/Based on/)).not.toBeInTheDocument()
        expect(within(item).queryByRole('link')).not.toBeInTheDocument()
      })

      it('is plain text, never a link (agents cannot open the knowledge base page)', async () => {
        mockGet().mockResolvedValue({ data: [aiReply] })
        renderWithQuery(<ReplyThread ticket={aiTicket} />)

        const item = await screen.findByRole('listitem')
        expect(within(item).queryByRole('link')).not.toBeInTheDocument()
      })

      it('shows each reply its own source', async () => {
        const other = { ...aiReply, id: 4, sourceArticle: { id: 9, title: 'Lifetime access' } }
        mockGet().mockResolvedValue({ data: [aiReply, agentReply, other] })
        renderWithQuery(<ReplyThread ticket={aiTicket} />)

        const items = await screen.findAllByRole('listitem')
        expect(items[0]).toHaveTextContent('Based on: Certificates')
        expect(items[1]).not.toHaveTextContent('Based on')
        expect(items[2]).toHaveTextContent('Based on: Lifetime access')
      })

      it.each([
        ['hi', 'आधारित: Certificates'],
        ['gu', 'આધારિત: Certificates'],
      ] as const)('is translated in %s', async (language, line) => {
        const { result } = renderHook(() => useLanguage())
        act(() => result.current.setLanguage(language))
        mockGet().mockResolvedValue({ data: [aiReply] })
        renderWithQuery(<ReplyThread ticket={aiTicket} />)

        expect(await screen.findByText(line)).toBeInTheDocument()
        expect(screen.queryByText(/Based on/)).not.toBeInTheDocument()

        act(() => result.current.setLanguage('en'))
      })
    })

    it('does not show the empty message', async () => {
      mockGet().mockResolvedValue({ data: [agentReply] })
      renderWithQuery(<ReplyThread ticket={ticket} />)
      await screen.findByRole('list')

      expect(screen.queryByText('No replies yet')).not.toBeInTheDocument()
    })
  })

  describe('empty', () => {
    it('shows "No replies yet" and no list', async () => {
      mockGet().mockResolvedValue({ data: [] })
      renderWithQuery(<ReplyThread ticket={ticket} />)

      expect(await screen.findByText('No replies yet')).toBeInTheDocument()
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
    })
  })

  describe('error', () => {
    it('shows an alert when the request fails, and keeps the form', async () => {
      mockGet().mockRejectedValue(httpError(500))
      renderWithQuery(<ReplyThread ticket={ticket} />)

      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load replies')
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
      expect(screen.queryByRole('status', { name: 'Loading replies' })).not.toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Reply' })).toBeInTheDocument()
    })
  })

  describe('reply form', () => {
    it('disables Send reply and sends nothing when the reply is whitespace-only', async () => {
      mockGet().mockResolvedValue({ data: [] })
      const post = mockPost()
      renderWithQuery(<ReplyThread ticket={ticket} />)
      await screen.findByText('No replies yet')

      fireEvent.change(screen.getByRole('textbox', { name: 'Reply' }), { target: { value: '   ' } })
      const send = screen.getByRole('button', { name: 'Send reply' })
      fireEvent.click(send)

      expect(send).toBeDisabled()
      expect(post).not.toHaveBeenCalled()
    })

    it('posts the trimmed reply, clears the field and refetches the thread', async () => {
      const get = mockGet().mockResolvedValue({ data: [] })
      const post = mockPost().mockResolvedValue({ data: agentReply })
      renderWithQuery(<ReplyThread ticket={ticket} />)
      await screen.findByText('No replies yet')

      const textbox = screen.getByRole('textbox', { name: 'Reply' })
      fireEvent.change(textbox, { target: { value: '  Hello there  ' } })
      fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))

      await waitFor(() => expect(post).toHaveBeenCalledWith('/api/tickets/7/replies', { body: 'Hello there' }))
      await waitFor(() => expect(textbox).toHaveValue(''))
      await waitFor(() => expect(get.mock.calls.filter(([url]) => url === '/api/tickets/7/replies')).toHaveLength(2))
    })

    it('disables Send reply while the field is empty', async () => {
      mockGet().mockResolvedValue({ data: [] })
      const post = mockPost()
      renderWithQuery(<ReplyThread ticket={ticket} />)
      await screen.findByText('No replies yet')

      const send = screen.getByRole('button', { name: 'Send reply' })
      expect(send).toBeDisabled()
      fireEvent.click(send)

      expect(post).not.toHaveBeenCalled()
    })

    it('disables Send reply and Polish when the draft is empty or whitespace-only, and enables them once there is text', async () => {
      mockGet().mockResolvedValue({ data: [] })
      renderWithQuery(<ReplyThread ticket={ticket} />)
      await screen.findByText('No replies yet')

      const textbox = screen.getByRole('textbox', { name: 'Reply' })
      const send = screen.getByRole('button', { name: 'Send reply' })
      const polish = screen.getByRole('button', { name: 'Polish' })
      expect(send).toBeDisabled()
      expect(polish).toBeDisabled()

      fireEvent.change(textbox, { target: { value: '   ' } })
      expect(send).toBeDisabled()
      expect(polish).toBeDisabled()

      fireEvent.change(textbox, { target: { value: 'Hi' } })
      expect(send).toBeEnabled()
      expect(polish).toBeEnabled()

      fireEvent.change(textbox, { target: { value: '' } })
      expect(send).toBeDisabled()
      expect(polish).toBeDisabled()
    })

    it('disables the form and shows "Sending…" while the reply is being sent', async () => {
      mockGet().mockResolvedValue({ data: [] })
      mockPost().mockReturnValue(new Promise(() => {}))
      renderWithQuery(<ReplyThread ticket={ticket} />)
      await screen.findByText('No replies yet')

      fireEvent.change(screen.getByRole('textbox', { name: 'Reply' }), { target: { value: 'Hi' } })
      fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))

      expect(await screen.findByRole('button', { name: 'Sending…' })).toBeDisabled()
      expect(screen.getByRole('textbox', { name: 'Reply' })).toBeDisabled()
    })

    it('shows the server error and keeps the text when sending fails', async () => {
      mockGet().mockResolvedValue({ data: [] })
      mockPost().mockRejectedValue(httpError(404, { error: 'Ticket not found' }))
      renderWithQuery(<ReplyThread ticket={ticket} />)
      await screen.findByText('No replies yet')

      fireEvent.change(screen.getByRole('textbox', { name: 'Reply' }), { target: { value: 'Hi' } })
      fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))

      expect(await screen.findByText('Ticket not found')).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Reply' })).toHaveValue('Hi')
    })

    it('shows a generic error when the failure has no server message', async () => {
      mockGet().mockResolvedValue({ data: [] })
      mockPost().mockRejectedValue(httpError(500))
      renderWithQuery(<ReplyThread ticket={ticket} />)
      await screen.findByText('No replies yet')

      fireEvent.change(screen.getByRole('textbox', { name: 'Reply' }), { target: { value: 'Hi' } })
      fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))

      expect(await screen.findByText('Failed to send reply')).toBeInTheDocument()
    })
  })

  describe('suggested reply', () => {
    const suggestion = { draftReply: 'Hi Ada, a certificate is issued when you finish.', confidence: 0.9, article: { id: 4, title: 'Certificates' } }
    const mockRoutes = (replies: Reply[], suggested: unknown = { suggestion }) =>
      mockGet().mockImplementation(async (url: string) => ({ data: url.endsWith('/suggested-reply') ? suggested : replies }))

    it('fills the Reply textarea with the draft and sends nothing', async () => {
      mockRoutes([])
      const post = mockPost()
      renderWithQuery(<ReplyThread ticket={ticket} />)

      fireEvent.click(await screen.findByRole('button', { name: 'Use this reply' }))

      const textbox = screen.getByRole('textbox', { name: 'Reply' })
      expect(textbox).toHaveValue(suggestion.draftReply)
      expect(textbox).toHaveFocus()
      expect(post).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Send reply' })).toBeEnabled()
    })

    it('does not ask for a draft, or show one, once the ticket has replies', async () => {
      const get = mockRoutes([agentReply])
      renderWithQuery(<ReplyThread ticket={ticket} />)
      await screen.findByText('We have processed your refund.')

      expect(screen.queryByText('Suggested reply')).not.toBeInTheDocument()
      expect(get.mock.calls.some(([url]) => String(url).endsWith('/suggested-reply'))).toBe(false)
    })

    it('shows nothing when there is no draft', async () => {
      mockRoutes([], { suggestion: null })
      renderWithQuery(<ReplyThread ticket={ticket} />)
      await screen.findByText('No replies yet')

      await waitFor(() => expect(screen.queryByText('Suggested reply')).not.toBeInTheDocument())
    })
  })
})
