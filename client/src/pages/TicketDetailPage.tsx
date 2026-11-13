import { isAxiosError } from 'axios'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ReplyThread } from '@/components/ReplyThread'
import { TicketDetail } from '@/components/TicketDetail'
import { UpdateTicket } from '@/components/UpdateTicket'
import { Skeleton } from '@/components/ui/skeleton'
import { useTicket } from '@/hooks/use-tickets'

export default function TicketDetailPage() {
  const { id } = useParams()
  const { data: ticket, error } = useTicket(id)

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
          <div className="space-y-6">
          <TicketDetail ticket={ticket} />
          <ReplyThread ticketId={ticket.id} />
          </div>
          <UpdateTicket ticket={ticket} />
        </div>
      )}
    </main>
  )
}
