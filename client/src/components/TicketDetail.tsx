import { useMemo } from 'react'
import DOMPurify from 'dompurify'
import { TicketStatus } from '@helpdesk/core'
import { Badge } from '@/components/ui/badge'
import { PriorityBadge, SentimentIcon } from '@/components/TicketTags'
import { TicketSummary } from '@/components/TicketSummary'
import { Card,CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { TicketDetail as TicketDetailData } from '@/hooks/use-tickets'
import { categoryLabels, statusLabels } from '@/lib/ticket-labels'

const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const statusVariants: Record<TicketStatus, 'default' | 'secondary' | 'outline'> = {
  [TicketStatus.OPEN]: 'default',
  [TicketStatus.RESOLVED]: 'secondary',
  [TicketStatus.CLOSED]: 'outline',
}

// The ticket's original message: subject, sender, date, status, priority, sentiment, category and body (no replies)
export function TicketDetail({ ticket }: { ticket: TicketDetailData }) {
  const sanitizedHtml = useMemo(() => (ticket.bodyHtml ? DOMPurify.sanitize(ticket.bodyHtml) : null), [ticket.bodyHtml])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          <h1>{ticket.subject || '(no subject)'}</h1>
        </CardTitle>
        <CardDescription>
          From {ticket.fromName} &lt;{ticket.fromEmail}&gt; · {dateFormat.format(new Date(ticket.createdAt))}
        </CardDescription>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Badge variant={statusVariants[ticket.status]}>{statusLabels[ticket.status]}</Badge>
          {/* Only shown once set: the sidebar shows "Not set" and lets an agent choose */}
          {ticket.priority && <PriorityBadge priority={ticket.priority} />}
          {ticket.sentiment && <SentimentIcon sentiment={ticket.sentiment} showLabel />}
          <span className="text-sm text-muted-foreground">
            {ticket.category ? categoryLabels[ticket.category] : 'Uncategorized'}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {sanitizedHtml ? (
          <div className="text-sm break-words" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
        ) : (
          <p className="whitespace-pre-wrap text-sm">{ticket.body}</p>
        )}
        <TicketSummary ticketId={ticket.id} />
      </CardContent>
    </Card>
  )
}
