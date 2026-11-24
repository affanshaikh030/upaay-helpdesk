import axios, { AxiosError, type AxiosResponse } from 'axios'
import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithQuery } from '@/test/render'
import type { SuggestedReply as Suggestion } from '@/hooks/use-tickets'
import { useLanguage } from '@/i18n/use-language'
import { SuggestedReply } from './SuggestedReply'

const suggestion: Suggestion = {
  draftReply: 'Hi Ada,\nA certificate is issued when you finish the course.',
  confidence: 0.9,
  article: { id: 4, title: 'Certificates' },
}

const mockGet = (suggested: Suggestion | null = suggestion) =>
  vi.spyOn(axios, 'get').mockResolvedValue({ data: { suggestion: suggested } })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SuggestedReply', () => {
  it('shows the draft with its AI label, its source article and both buttons', async () => {
    const get = mockGet()
    renderWithQuery(<SuggestedReply ticketId={7} hasNoReplies onUse={() => {}} />)

    expect(await screen.findByRole('heading', { name: 'Suggested reply' })).toBeInTheDocument()
    expect(screen.getByText('AI-generated draft')).toBeInTheDocument()
    expect(screen.getByText(/A certificate is issued when you finish the course\./)).toBeInTheDocument()
    expect(screen.getByText('Based on: Certificates')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use this reply' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/api/tickets/7/suggested-reply', { signal: expect.any(AbortSignal) })
  })

  it('leaves out "Based on" when the article is gone', async () => {
    mockGet({ ...suggestion, article: null })
    renderWithQuery(<SuggestedReply ticketId={7} hasNoReplies onUse={() => {}} />)

    await screen.findByText('Suggested reply')
    expect(screen.queryByText(/Based on/)).not.toBeInTheDocument()
  })

  it('is hidden, and asks for nothing, while the ticket has replies or they are not loaded', () => {
    const get = mockGet()
    renderWithQuery(<SuggestedReply ticketId={7} hasNoReplies={false} onUse={() => {}} />)

    expect(screen.queryByText('Suggested reply')).not.toBeInTheDocument()
    expect(get).not.toHaveBeenCalled()
  })

  it('is hidden when there is no draft', async () => {
    const get = mockGet(null)
    renderWithQuery(<SuggestedReply ticketId={7} hasNoReplies onUse={() => {}} />)

    await waitFor(() => expect(get).toHaveBeenCalled())
    expect(screen.queryByText('Suggested reply')).not.toBeInTheDocument()
  })

  it('is hidden when the request fails', async () => {
    const response = { status: 500, data: {} } as AxiosResponse
    const get = vi.spyOn(axios, 'get').mockRejectedValue(new AxiosError('fail', 'ERR_BAD_RESPONSE', undefined, undefined, response))
    renderWithQuery(<SuggestedReply ticketId={7} hasNoReplies onUse={() => {}} />)

    await waitFor(() => expect(get).toHaveBeenCalled())
    expect(screen.queryByText('Suggested reply')).not.toBeInTheDocument()
  })

  it('hands the draft to onUse and nothing else: no request is made to change anything', async () => {
    mockGet()
    const post = vi.spyOn(axios, 'post')
    const patch = vi.spyOn(axios, 'patch')
    const onUse = vi.fn()
    renderWithQuery(<SuggestedReply ticketId={7} hasNoReplies onUse={onUse} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Use this reply' }))

    expect(onUse).toHaveBeenCalledExactlyOnceWith(suggestion.draftReply)
    expect(post).not.toHaveBeenCalled()
    expect(patch).not.toHaveBeenCalled()
  })

  it('hides itself when dismissed', async () => {
    mockGet()
    const onUse = vi.fn()
    renderWithQuery(<SuggestedReply ticketId={7} hasNoReplies onUse={onUse} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss' }))

    expect(screen.queryByText('Suggested reply')).not.toBeInTheDocument()
    expect(onUse).not.toHaveBeenCalled()
  })

  it.each([
    ['hi', 'सुझाया गया उत्तर', 'AI द्वारा बनाया गया ड्राफ़्ट', 'यह उत्तर उपयोग करें', 'हटाएँ', 'आधारित: Certificates'],
    ['gu', 'સૂચવેલ જવાબ', 'AI દ્વારા બનાવેલ ડ્રાફ્ટ', 'આ જવાબ વાપરો', 'છોડી દો', 'આધારિત: Certificates'],
  ] as const)('is translated in %s', async (language, title, label, use, dismiss, basedOn) => {
    mockGet()
    const { result } = renderHook(() => useLanguage())
    act(() => result.current.setLanguage(language))
    try {
      renderWithQuery(<SuggestedReply ticketId={7} hasNoReplies onUse={() => {}} />)

      expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
      expect(screen.getByText(label)).toBeInTheDocument()
      expect(screen.getByText(basedOn)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: use })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: dismiss })).toBeInTheDocument()
    } finally {
      act(() => result.current.setLanguage('en'))
    }
  })
})
