import { useState } from 'react'
import type { SortingState } from '@tanstack/react-table'
import type { TicketSortColumn } from '@helpdesk/core'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TicketsTable } from '@/components/TicketsTable'
import { defaultTicketSort, useTickets } from '@/hooks/use-tickets'

export default function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([
    { id: defaultTicketSort.sortBy, desc: defaultTicketSort.sortOrder === 'desc' },
  ])
  const { data: tickets, error } = useTickets({
    sortBy: sorting[0].id as TicketSortColumn,
    sortOrder: sorting[0].desc ? 'desc' : 'asc',
  })

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            <h1>Tickets</h1>
          </CardTitle>
          <CardDescription>
            {tickets
              ? `${tickets.length} ${tickets.length === 1 ? 'ticket' : 'tickets'}`
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
            <TicketsTable tickets={tickets} sorting={sorting} onSortingChange={setSorting} />
          )}
        </CardContent>
      </Card>
    </main>
  )
}
