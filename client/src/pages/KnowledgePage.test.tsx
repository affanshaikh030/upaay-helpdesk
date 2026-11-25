import axios, { AxiosError, type AxiosResponse } from 'axios'
import { act, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ATTEMPTS_DEFAULT_PAGE_SIZE, KNOWLEDGE_CONTENT_MAX, KNOWLEDGE_TITLE_MAX } from '@helpdesk/core'
import { renderWithQuery } from '@/test/render'
import type { KnowledgeArticle, KnowledgeAttempt, KnowledgeAttemptPage } from '@/hooks/use-knowledge'
import { useLanguage } from '@/i18n/use-language'
import KnowledgePage from './KnowledgePage'

const refund: KnowledgeArticle = {
  id: 3,
  title: 'Refund policy',
  content: '30-day money-back guarantee.',
  language: 'EN',
  createdAt: '2026-11-18T10:00:00.000Z',
  updatedAt: '2026-11-20T10:00:00.000Z',
}
const certificates: KnowledgeArticle = {
  id: 5,
  title: 'Certificates',
  content: 'A certificate is issued upon completion.',
  language: null,
  createdAt: '2026-11-19T10:00:00.000Z',
  updatedAt: '2026-11-19T10:00:00.000Z',
}

const attempt = (overrides: Partial<KnowledgeAttempt> = {}): KnowledgeAttempt => ({
  id: 1,
  ticketId: 12,
  ticketSubject: 'Do you offer certificates?',
  decision: 'RESOLVE',
  reason: 'RESOLVED',
  topRank: 0.7,
  confidence: 0.92,
  draftReply: 'Hi Jane, yes, you get a certificate.',
  citedArticles: [{ id: 5, title: 'Certificates' }],
  shadow: true,
  acted: false,
  createdAt: '2026-11-21T10:00:00.000Z',
  ...overrides,
})

const formatDate = (iso: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))

function httpError(status: number, data: unknown = {}) {
  const response = { status, data } as AxiosResponse
  return new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', undefined, undefined, response)
}

type Reply<T> = T | AxiosError | Promise<never>
// Routes GET requests by URL: the article list and the attempts
function mockGets({
  articles = [refund, certificates],
  attempts = { attempts: [], total: 0 },
}: { articles?: Reply<KnowledgeArticle[]>; attempts?: Reply<KnowledgeAttemptPage> } = {}) {
  return vi.spyOn(axios, 'get').mockImplementation(async (url: string) => {
    const reply = url === '/api/knowledge/attempts' ? attempts : articles
    if (reply instanceof AxiosError) throw reply
    return { data: await reply }
  })
}

const articlesTable = () => screen.getAllByRole('table')[0]
const attemptsTable = () => screen.getAllByRole('table')[1]

afterEach(() => {
  vi.restoreAllMocks()
  const { result } = renderHook(() => useLanguage())
  act(() => result.current.setLanguage('en'))
})

describe('KnowledgePage: articles', () => {
  it('shows skeletons in a status region while loading, then the table', async () => {
    mockGets({ articles: new Promise(() => {}) as Promise<never> })
    renderWithQuery(<KnowledgePage />)

    const status = screen.getByRole('status', { name: 'Loading articles' })
    expect(status.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { level: 1, name: 'FAQs' })).toBeInTheDocument()
    expect(screen.getByText('Articles the AI answers customers from')).toBeInTheDocument()
  })

  it('requests /api/knowledge with an abort signal, once', async () => {
    const get = mockGets()
    renderWithQuery(<KnowledgePage />)
    await screen.findByText('Refund policy')

    const calls = get.mock.calls.filter(([url]) => url === '/api/knowledge')
    expect(calls).toHaveLength(1)
    expect(calls[0][1]).toEqual({ signal: expect.any(AbortSignal) })
  })

  it('lists each article with its title, language name and updated date', async () => {
    mockGets()
    renderWithQuery(<KnowledgePage />)
    await screen.findByText('Refund policy')

    expect(within(articlesTable()).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Title',
      'Language',
      'Updated',
      'Actions',
    ])
    const rows = within(articlesTable()).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Refund policy')).toBeInTheDocument()
    expect(within(rows[0]).getByText('English')).toBeInTheDocument()
    expect(within(rows[0]).getByText(formatDate(refund.updatedAt))).toBeInTheDocument()
    expect(within(rows[1]).getByText('Certificates')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Not set')).toBeInTheDocument()
    expect(screen.getByText('2 articles')).toBeInTheDocument()
  })

  it('shows a singular count for one article, and never the raw enum value', async () => {
    mockGets({ articles: [refund] })
    renderWithQuery(<KnowledgePage />)

    expect(await screen.findByText('1 article')).toBeInTheDocument()
    expect(screen.queryByText('EN')).not.toBeInTheDocument()
  })

  it('shows an empty message and no table when there are no articles', async () => {
    mockGets({ articles: [] })
    renderWithQuery(<KnowledgePage />)

    expect(await screen.findByText('No articles yet. Add one for the AI to answer from.')).toBeInTheDocument()
    expect(screen.getByText('0 articles')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows an access message when the API answers 403', async () => {
    mockGets({ articles: httpError(403) })
    renderWithQuery(<KnowledgePage />)

    expect((await screen.findAllByText('You do not have access to this page')).length).toBeGreaterThan(0)
    expect(screen.queryByText('Refund policy')).not.toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Loading articles' })).not.toBeInTheDocument()
  })

  it('shows a generic message for a 500, a network error and a plain error, and does not retry', async () => {
    for (const error of [httpError(500), new AxiosError('Network Error', 'ERR_NETWORK')]) {
      const get = mockGets({ articles: error })
      const { unmount } = renderWithQuery(<KnowledgePage />)

      expect(await screen.findByText('Failed to load articles')).toBeInTheDocument()
      expect(get.mock.calls.filter(([url]) => url === '/api/knowledge')).toHaveLength(1)
      unmount()
      vi.restoreAllMocks()
    }
  })
})

describe('KnowledgePage: new article', () => {
  async function openNewArticle() {
    renderWithQuery(<KnowledgePage />)
    await screen.findByText('Refund policy')
    fireEvent.click(screen.getByRole('button', { name: 'New article' }))
    return screen.findByRole('dialog', { name: 'New article' })
  }

  it('opens a dialog with an empty form, a language choice and a character counter', async () => {
    mockGets()
    const dialog = await openNewArticle()

    expect(within(dialog).getByLabelText('Title')).toHaveValue('')
    expect(within(dialog).getByLabelText('Content')).toHaveValue('')
    const language = within(dialog).getByLabelText('Language')
    expect(Array.from(language.querySelectorAll('option')).map((o) => o.textContent)).toEqual([
      'Not set',
      'English',
      'हिन्दी',
      'ગુજરાતી',
    ])
    expect(within(dialog).getByText(`0 / ${KNOWLEDGE_CONTENT_MAX.toLocaleString()} characters`)).toBeInTheDocument()
  })

  it('counts the characters as you type', async () => {
    mockGets()
    const dialog = await openNewArticle()

    fireEvent.change(within(dialog).getByLabelText('Content'), { target: { value: 'twelve chars' } })

    expect(within(dialog).getByText(`12 / ${KNOWLEDGE_CONTENT_MAX.toLocaleString()} characters`)).toBeInTheDocument()
  })

  it('posts the trimmed values with no language, closes, and reloads the list', async () => {
    const get = mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: refund })
    const dialog = await openNewArticle()
    const loadsBefore = get.mock.calls.filter(([url]) => url === '/api/knowledge').length

    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: '  Lifetime access  ' } })
    fireEvent.change(within(dialog).getByLabelText('Content'), { target: { value: 'You keep access permanently.' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create article' }))

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/api/knowledge', {
        title: 'Lifetime access',
        content: 'You keep access permanently.',
        language: null,
      }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() =>
      expect(get.mock.calls.filter(([url]) => url === '/api/knowledge').length).toBeGreaterThan(loadsBefore),
    )
  })

  it('posts the chosen language', async () => {
    mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: refund })
    const dialog = await openNewArticle()

    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Refund' } })
    fireEvent.change(within(dialog).getByLabelText('Content'), { target: { value: 'रिफंड नीति' } })
    fireEvent.change(within(dialog).getByLabelText('Language'), { target: { value: 'HI' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create article' }))

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/api/knowledge', { title: 'Refund', content: 'रिफंड नीति', language: 'HI' }),
    )
  })

  it('shows required-field errors and does not post an empty or blank form', async () => {
    mockGets()
    const post = vi.spyOn(axios, 'post')
    const dialog = await openNewArticle()

    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: '   ' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create article' }))

    expect(await within(dialog).findByText('Title is required')).toBeInTheDocument()
    expect(within(dialog).getByText('Content is required')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')
    expect(post).not.toHaveBeenCalled()
  })

  it('rejects a title and content over the shared limits', async () => {
    mockGets()
    const post = vi.spyOn(axios, 'post')
    const dialog = await openNewArticle()

    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'x'.repeat(KNOWLEDGE_TITLE_MAX + 1) } })
    fireEvent.change(within(dialog).getByLabelText('Content'), { target: { value: 'y'.repeat(KNOWLEDGE_CONTENT_MAX + 1) } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create article' }))

    expect(await within(dialog).findByText(`Title must be at most ${KNOWLEDGE_TITLE_MAX} characters`)).toBeInTheDocument()
    expect(
      within(dialog).getByText(`Content must be at most ${KNOWLEDGE_CONTENT_MAX.toLocaleString()} characters`),
    ).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it('accepts a title and content exactly at the limits', async () => {
    mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: refund })
    const dialog = await openNewArticle()

    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'x'.repeat(KNOWLEDGE_TITLE_MAX) } })
    fireEvent.change(within(dialog).getByLabelText('Content'), { target: { value: 'y'.repeat(KNOWLEDGE_CONTENT_MAX) } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create article' }))

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
  })

  it('shows an error and stays open when the server fails', async () => {
    mockGets()
    vi.spyOn(axios, 'post').mockRejectedValue(httpError(500))
    const dialog = await openNewArticle()

    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'T' } })
    fireEvent.change(within(dialog).getByLabelText('Content'), { target: { value: 'C' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create article' }))

    expect(await within(dialog).findByText('Failed to create article')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it("shows the server's field error under the field", async () => {
    mockGets()
    vi.spyOn(axios, 'post').mockRejectedValue(httpError(400, { fieldErrors: { title: ['Title is required'] } }))
    const dialog = await openNewArticle()

    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'T' } })
    fireEvent.change(within(dialog).getByLabelText('Content'), { target: { value: 'C' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create article' }))

    expect(await within(dialog).findByText('Title is required')).toBeInTheDocument()
    expect(within(dialog).queryByText('Failed to create article')).not.toBeInTheDocument()
  })

  it('closes on Cancel without posting', async () => {
    mockGets()
    const post = vi.spyOn(axios, 'post')
    const dialog = await openNewArticle()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(post).not.toHaveBeenCalled()
  })
})

describe('KnowledgePage: edit article', () => {
  async function openEdit(name = 'Edit Refund policy') {
    renderWithQuery(<KnowledgePage />)
    await screen.findByText('Refund policy')
    fireEvent.click(screen.getByRole('button', { name }))
    return screen.findByRole('dialog', { name: 'Edit article' })
  }

  it('opens with the article filled in', async () => {
    mockGets()
    const dialog = await openEdit()

    expect(within(dialog).getByLabelText('Title')).toHaveValue('Refund policy')
    expect(within(dialog).getByLabelText('Content')).toHaveValue('30-day money-back guarantee.')
    expect(within(dialog).getByLabelText('Language')).toHaveValue('EN')
    expect(within(dialog).getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })

  it('patches the article by id with the edited values, closes, and reloads the list', async () => {
    const get = mockGets()
    const patch = vi.spyOn(axios, 'patch').mockResolvedValue({ data: refund })
    const dialog = await openEdit()
    const loadsBefore = get.mock.calls.filter(([url]) => url === '/api/knowledge').length

    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Refund policy (2026)' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/api/knowledge/3', {
        title: 'Refund policy (2026)',
        content: '30-day money-back guarantee.',
        language: 'EN',
      }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() =>
      expect(get.mock.calls.filter(([url]) => url === '/api/knowledge').length).toBeGreaterThan(loadsBefore),
    )
  })

  it('clears the language when Not set is chosen', async () => {
    mockGets()
    const patch = vi.spyOn(axios, 'patch').mockResolvedValue({ data: refund })
    const dialog = await openEdit()

    fireEvent.change(within(dialog).getByLabelText('Language'), { target: { value: '' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(patch).toHaveBeenCalledWith('/api/knowledge/3', expect.objectContaining({ language: null })))
  })

  it('shows an error and stays open when the save fails', async () => {
    mockGets()
    vi.spyOn(axios, 'patch').mockRejectedValue(httpError(404))
    const dialog = await openEdit()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await within(dialog).findByText('Failed to save article')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not save a blank title', async () => {
    mockGets()
    const patch = vi.spyOn(axios, 'patch')
    const dialog = await openEdit()

    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: '' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await within(dialog).findByText('Title is required')).toBeInTheDocument()
    expect(patch).not.toHaveBeenCalled()
  })

  it('opens the right article when another is edited next', async () => {
    mockGets()
    renderWithQuery(<KnowledgePage />)
    await screen.findByText('Refund policy')

    fireEvent.click(screen.getByRole('button', { name: 'Edit Certificates' }))

    const dialog = await screen.findByRole('dialog', { name: 'Edit article' })
    expect(within(dialog).getByLabelText('Title')).toHaveValue('Certificates')
    expect(within(dialog).getByLabelText('Language')).toHaveValue('')
  })
})

describe('KnowledgePage: delete article', () => {
  async function openDelete() {
    renderWithQuery(<KnowledgePage />)
    await screen.findByText('Refund policy')
    fireEvent.click(screen.getByRole('button', { name: 'Delete Refund policy' }))
    return screen.findByRole('dialog', { name: 'Delete article' })
  }

  it('asks for confirmation and says what happens to the replies written from it', async () => {
    mockGets()
    const del = vi.spyOn(axios, 'delete')
    const dialog = await openDelete()

    expect(within(dialog).getByText(/Delete "Refund policy"\?/)).toBeInTheDocument()
    expect(within(dialog).getByText(/lose the "Based on" line/)).toBeInTheDocument()
    expect(del).not.toHaveBeenCalled()
  })

  it('deletes by id, closes, and reloads the list', async () => {
    const get = mockGets()
    const del = vi.spyOn(axios, 'delete').mockResolvedValue({ status: 204 })
    const dialog = await openDelete()
    const loadsBefore = get.mock.calls.filter(([url]) => url === '/api/knowledge').length

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(del).toHaveBeenCalledWith('/api/knowledge/3'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() =>
      expect(get.mock.calls.filter(([url]) => url === '/api/knowledge').length).toBeGreaterThan(loadsBefore),
    )
  })

  it('shows an error and stays open when the delete fails', async () => {
    mockGets()
    vi.spyOn(axios, 'delete').mockRejectedValue(httpError(500))
    const dialog = await openDelete()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await within(dialog).findByText('Failed to delete article')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not delete on Cancel', async () => {
    mockGets()
    const del = vi.spyOn(axios, 'delete')
    const dialog = await openDelete()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(del).not.toHaveBeenCalled()
  })
})

describe('KnowledgePage: AI auto-resolve results', () => {
  it('shows a status region while loading', async () => {
    mockGets({ attempts: new Promise(() => {}) as Promise<never> })
    renderWithQuery(<KnowledgePage />)

    expect(screen.getByRole('status', { name: 'Loading results' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'AI auto-resolve results' })).toBeInTheDocument()
  })

  it('requests the first page with the page size', async () => {
    const get = mockGets({ attempts: { attempts: [attempt()], total: 1 } })
    renderWithQuery(<KnowledgePage />)
    await screen.findByText('Do you offer certificates?')

    expect(get).toHaveBeenCalledWith('/api/knowledge/attempts', {
      params: { page: 1, pageSize: ATTEMPTS_DEFAULT_PAGE_SIZE },
      signal: expect.any(AbortSignal),
    })
  })

  it('shows an empty message when there are no results', async () => {
    mockGets({ attempts: { attempts: [], total: 0 } })
    renderWithQuery(<KnowledgePage />)

    expect(await screen.findByText('No results yet.')).toBeInTheDocument()
  })

  it('shows the ticket subject (linked), decision, mode, reason, rank, confidence, draft reply and cited article', async () => {
    mockGets({ attempts: { attempts: [attempt()], total: 1 } })
    renderWithQuery(<KnowledgePage />)
    await screen.findByText('Do you offer certificates?')

    expect(within(attemptsTable()).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Ticket',
      'Decision',
      'Reason',
      'Top rank',
      'Confidence',
      'Draft reply',
      'Cited article',
    ])
    const row = within(within(attemptsTable()).getAllByRole('row')[1])
    expect(row.getByRole('link', { name: 'Do you offer certificates?' })).toHaveAttribute('href', '/tickets/12')
    expect(row.getByText('Resolve')).toBeInTheDocument()
    expect(row.getByText('Shadow')).toBeInTheDocument()
    expect(row.getByText('Resolved')).toBeInTheDocument()
    expect(row.getByText('0.70')).toBeInTheDocument()
    expect(row.getByText('0.92')).toBeInTheDocument()
    expect(row.getByText('Hi Jane, yes, you get a certificate.')).toBeInTheDocument()
    expect(row.getByText('Certificates')).toBeInTheDocument()
  })

  it('labels the reason and mode in words, never the raw enum values', async () => {
    mockGets({
      attempts: {
        attempts: [attempt({ id: 2, decision: 'ESCALATE', reason: 'NEGATIVE_SENTIMENT', shadow: false, acted: false })],
        total: 1,
      },
    })
    renderWithQuery(<KnowledgePage />)
    await screen.findByText('Negative sentiment')

    expect(screen.getByText('Escalate')).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.queryByText('NEGATIVE_SENTIMENT')).not.toBeInTheDocument()
    expect(screen.queryByText('ESCALATE')).not.toBeInTheDocument()
  })

  it('shows Deleted for a cited article that no longer exists', async () => {
    mockGets({
      attempts: {
        attempts: [attempt({ citedArticles: [{ id: 5, title: 'Certificates' }, { id: 9, title: null }] })],
        total: 1,
      },
    })
    renderWithQuery(<KnowledgePage />)
    await screen.findByText('Do you offer certificates?')

    const cell = within(attemptsTable()).getAllByRole('row')[1].querySelectorAll('td')[6]
    expect(cell).toHaveTextContent('Certificates, Deleted')
  })

  it('shows a dash for what does not exist when the AI was not called', async () => {
    mockGets({
      attempts: {
        attempts: [
          attempt({ decision: 'ESCALATE', reason: 'URGENT', topRank: null, confidence: null, draftReply: null, citedArticles: [] }),
        ],
        total: 1,
      },
    })
    renderWithQuery(<KnowledgePage />)
    await screen.findByText('Urgent priority')

    const cells = within(attemptsTable()).getAllByRole('row')[1].querySelectorAll('td')
    for (const index of [3, 4, 5, 6]) expect(cells[index]).toHaveTextContent('Not set')
    expect(within(attemptsTable()).queryByText('null')).not.toBeInTheDocument()
  })

  it('shows an access message for a 403, and a generic one for other errors, without touching the articles', async () => {
    mockGets({ attempts: httpError(403) })
    const { unmount } = renderWithQuery(<KnowledgePage />)

    expect(await screen.findByText('You do not have access to this page')).toBeInTheDocument()
    expect(await screen.findByText('Refund policy')).toBeInTheDocument()
    unmount()
    vi.restoreAllMocks()

    mockGets({ attempts: httpError(500) })
    renderWithQuery(<KnowledgePage />)

    expect(await screen.findByText('Failed to load results')).toBeInTheDocument()
    expect(await screen.findByText('Refund policy')).toBeInTheDocument()
  })

  it('pages through the results', async () => {
    const get = mockGets({ attempts: { attempts: [attempt()], total: 45 } })
    renderWithQuery(<KnowledgePage />)
    await screen.findByText('Do you offer certificates?')

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    expect(screen.getByText(`Showing 1–${ATTEMPTS_DEFAULT_PAGE_SIZE} of 45`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('/api/knowledge/attempts', {
        params: { page: 2, pageSize: ATTEMPTS_DEFAULT_PAGE_SIZE },
        signal: expect.any(AbortSignal),
      }),
    )
  })

  it('reloads the results after an article is edited, since they show cited titles', async () => {
    const get = mockGets({ attempts: { attempts: [attempt()], total: 1 } })
    vi.spyOn(axios, 'patch').mockResolvedValue({ data: refund })
    renderWithQuery(<KnowledgePage />)
    await screen.findByText('Do you offer certificates?')
    const loadsBefore = get.mock.calls.filter(([url]) => url === '/api/knowledge/attempts').length

    fireEvent.click(screen.getByRole('button', { name: 'Edit Refund policy' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit article' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(get.mock.calls.filter(([url]) => url === '/api/knowledge/attempts').length).toBeGreaterThan(loadsBefore),
    )
  })
})

describe('KnowledgePage: translations', () => {
  it.each([
    ['hi', 'सामान्य प्रश्न', 'नया लेख', 'AI स्वतः-समाधान के परिणाम'],
    ['gu', 'સામાન્ય પ્રશ્નો', 'નવો લેખ', 'AI સ્વતઃ-ઉકેલના પરિણામો'],
  ] as const)('renders in %s', async (language, title, newArticle, attemptsTitle) => {
    const { result } = renderHook(() => useLanguage())
    act(() => result.current.setLanguage(language))
    mockGets({ attempts: { attempts: [attempt()], total: 1 } })
    renderWithQuery(<KnowledgePage />)

    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: newArticle })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: attemptsTitle })).toBeInTheDocument()
    expect(screen.queryByText('New article')).not.toBeInTheDocument()
  })
})
