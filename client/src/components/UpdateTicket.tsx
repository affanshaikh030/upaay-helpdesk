import type { TicketCategory, TicketPriority, TicketSentiment, TicketStatus } from '@helpdesk/core'
import { AnalyseButton } from '@/components/AnalyseButton'
import { SelectField } from '@/components/SelectField'
import { Card, CardContent } from '@/components/ui/card'
import { useAssignees, useUpdateTicket, type TicketDetail } from '@/hooks/use-tickets'
import { useLanguage } from '@/i18n/use-language'
import { categoryLabels, statusLabels } from '@/lib/ticket-labels'

// Sidebar controls for a ticket's status, category, priority, sentiment and assignee; each change is saved immediately.
// Priority and sentiment are set by AI and can be overridden here. Admins also get a button to run the AI analysis
// again while either is still empty
export function UpdateTicket({ ticket }: { ticket: TicketDetail }) {
  const { data: assignees } = useAssignees()
  const update = useUpdateTicket(ticket.id)
  const { t } = useLanguage()

  return (
    <Card className="self-start">
      <CardContent className="space-y-4">
        <SelectField
          id="ticket-status"
          label="Status"
          value={ticket.status}
          disabled={update.isPending}
          onChange={(e) => update.mutate({ status: e.target.value as TicketStatus })}
        >
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <SelectField
          id="ticket-category"
          label="Category"
          value={ticket.category ?? ''}
          disabled={update.isPending}
          onChange={(e) => update.mutate({ category: (e.target.value || null) as TicketCategory | null })}
        >
          <option value="">Uncategorized</option>
          {Object.entries(categoryLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <SelectField
          id="ticket-priority"
          label={t.filterPriority}
          value={ticket.priority ?? ''}
          disabled={update.isPending}
          onChange={(e) => update.mutate({ priority: (e.target.value || null) as TicketPriority | null })}
        >
          <option value="">{t.notSet}</option>
          {Object.entries(t.priorities).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <SelectField
          id="ticket-sentiment"
          label={t.filterSentiment}
          value={ticket.sentiment ?? ''}
          disabled={update.isPending}
          onChange={(e) => update.mutate({ sentiment: (e.target.value || null) as TicketSentiment | null })}
        >
          <option value="">{t.notSet}</option>
          {Object.entries(t.sentiments).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <SelectField
          id="ticket-assignee"
          label="Assigned to"
          value={ticket.assignedTo?.id ?? ''}
          disabled={update.isPending}
          onChange={(e) => update.mutate({ assignedToId: e.target.value || null })}
        >
          <option value="">Unassigned</option>
          {assignees?.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </SelectField>
        {(ticket.priority === null || ticket.sentiment === null) && <AnalyseButton ticketId={ticket.id} />}
        {update.isError && <p className="text-sm text-destructive">Failed to update ticket</p>}
      </CardContent>
    </Card>
  )
}
