import { TicketCategory, TicketStatus } from '@helpdesk/core'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Ticket } from '@/hooks/use-tickets'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

const statusLabels: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'Open',
  [TicketStatus.RESOLVED]: 'Resolved',
  [TicketStatus.CLOSED]: 'Closed',
}

const statusVariants: Record<TicketStatus, 'default' | 'secondary' | 'outline'> = {
  [TicketStatus.OPEN]: 'default',
  [TicketStatus.RESOLVED]: 'secondary',
  [TicketStatus.CLOSED]: 'outline',
}

const categoryLabels: Record<TicketCategory, string> = {
  [TicketCategory.GENERAL_QUESTION]: 'General question',
  [TicketCategory.TECHNICAL_QUESTION]: 'Technical question',
  [TicketCategory.REFUND_REQUEST]: 'Refund request',
}

export function TicketsTable({ tickets }: { tickets: Ticket[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead>From</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((ticket) => (
          <TableRow key={ticket.id}>
            <TableCell className="max-w-xs truncate font-medium">{ticket.subject}</TableCell>
            <TableCell>
              <div>{ticket.fromName}</div>
              <div className="text-xs text-muted-foreground">{ticket.fromEmail}</div>
            </TableCell>
            <TableCell>
              <Badge variant={statusVariants[ticket.status]}>{statusLabels[ticket.status]}</Badge>
            </TableCell>
            <TableCell>
              {ticket.category ? categoryLabels[ticket.category] : <span className="text-muted-foreground">Uncategorized</span>}
            </TableCell>
            <TableCell className="whitespace-nowrap">{dateFormat.format(new Date(ticket.createdAt))}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
