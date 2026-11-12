import { isAxiosError } from 'axios'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { TicketStatus, type TicketCategory } from '@helpdesk/core'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { useAssignees, useTicket, useUpdateTicket } from '@/hooks/use-tickets'
import { categoryLabels, statusLabels } from '@/lib/ticket-labels'

const selectClass =
  'block h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30'

const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const statusVariants: Record<TicketStatus, 'default' | 'secondary' | 'outline'> = {
  [TicketStatus.OPEN]: 'default',
  [TicketStatus.RESOLVED]: 'secondary',
  [TicketStatus.CLOSED]: 'outline',
}

export default function TicketDetailPage() {
  const { id } = useParams()
  const { data: ticket, error } = useTicket(id)
  const { data: assignees } = useAssignees()
  const update = useUpdateTicket(Number(id))

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <Link
        to="/tickets"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to tickets
      </Link>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {isAxiosError(error) && error.response?.status === 404 ? 'Ticket not found' : 'Failed to load ticket'}
          </AlertDescription>
        </Alert>
      ) : !ticket ? (
        <div role="status" aria-label="Loading ticket" className="space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="grid items-start gap-6 md:grid-cols-[1fr_8rem]">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                <h1>{ticket.subject || '(no subject)'}</h1>
              </CardTitle>
              <CardDescription>
                From {ticket.fromName} &lt;{ticket.fromEmail}&gt; · {dateFormat.format(new Date(ticket.createdAt))}
              </CardDescription>
              <div className="flex items-center gap-2 pt-2">
                <Badge variant={statusVariants[ticket.status]}>{statusLabels[ticket.status]}</Badge>
                <span className="text-sm text-muted-foreground">
                  {ticket.category ? categoryLabels[ticket.category] : 'Uncategorized'}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{ticket.body}</p>
            </CardContent>
          </Card>
          <Card className="self-start">
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ticket-status">Status</Label>
                <select
                  id="ticket-status"
                  className={selectClass}
                  value={ticket.status}
                  disabled={update.isPending}
                  onChange={(e) => update.mutate({ status: e.target.value as TicketStatus })}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ticket-category">Category</Label>
                <select
                  id="ticket-category"
                  className={selectClass}
                  value={ticket.category ?? ''}
                  disabled={update.isPending}
                  onChange={(e) =>
                    update.mutate({
                      category: (e.target.value || null) as TicketCategory | null,
                    })
                  }
                >
                  <option value="">Uncategorized</option>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ticket-assignee">Assigned to</Label>
                <select
                  id="ticket-assignee"
                  className={selectClass}
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
                </select>
              </div>
              {update.isError && <p className="text-sm text-destructive">Failed to update ticket</p>}
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  )
}
