import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TicketsTable } from '@/components/TicketsTable'
import { useTickets } from '@/hooks/use-tickets'

export default function TicketsPage() {
  const { data: tickets, error } = useTickets()

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            <h1>Tickets</h1>
          </CardTitle>
          <CardDescription>
            {tickets
              ? `${tickets.length} ${tickets.length === 1 ? 'ticket' : 'tickets'}, newest first`
              : 'Support requests received by email'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>Failed to load tickets</AlertDescription>
            </Alert>
          ) : !tickets ? (
            <div role="status" aria-label="Loading tickets" className="space-y-3">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-2/5" />
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-1/6" />
                </div>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets yet.</p>
          ) : (
            <TicketsTable tickets={tickets} />
          )}
        </CardContent>
      </Card>
    </main>
  )
}
