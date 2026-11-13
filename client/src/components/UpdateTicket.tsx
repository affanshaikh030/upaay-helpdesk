import type { TicketCategory, TicketStatus } from '@helpdesk/core'
import { SelectField } from '@/components/SelectField'
import { Card, CardContent } from '@/components/ui/card'
import { useAssignees, useUpdateTicket, type TicketDetail } from '@/hooks/use-tickets'
import { categoryLabels, statusLabels } from '@/lib/ticket-labels'

// Sidebar controls for a ticket's status, category and assignee; each change is saved immediately
export function UpdateTicket({ ticket }: { ticket: TicketDetail }) {
  const { data: assignees } = useAssignees()
  const update = useUpdateTicket(ticket.id)

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
        {update.isError && <p className="text-sm text-destructive">Failed to update ticket</p>}
      </CardContent>
    </Card>
  )
}
