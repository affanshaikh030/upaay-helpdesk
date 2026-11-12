import { useEffect, useState } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { DEFAULT_PAGE_SIZE, type TicketSortColumn } from '@helpdesk/core'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TicketsFilters, emptyFilters, type TicketFilters } from '@/components/TicketsFilters'
import { TicketsPagination } from '@/components/TicketsPagination'
import { TicketsTable } from '@/components/TicketsTable'
import { defaultTicketSort, useTickets } from '@/hooks/use-tickets'

export default function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([
    { id: defaultTicketSort.sortBy, desc: defaultTicketSort.sortOrder === 'desc' },
  ])
  const [filters, setFilters] = useState<TicketFilters>(emptyFilters)
  const [page, setPage] = useState(1)
  // Wait for a pause in typing before asking the server to search
  const [search, setSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(filters.search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [filters.search])
  const isFiltered = search !== '' || filters.status !== '' || filters.category !== ''

  const { data, error } = useTickets({
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    status: filters.status || undefined,
    category: filters.category || undefined,
    search: search || undefined,
    sortBy: sorting[0].id as TicketSortColumn,
    sortOrder: sorting[0].desc ? 'desc' : 'asc',
  })

  const tickets = data?.tickets
  const pageCount = data ? Math.max(1, Math.ceil(data.total / DEFAULT_PAGE_SIZE)) : 1

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            <h1>Tickets</h1>
          </CardTitle>
          <CardDescription>
            {tickets
              ? `${data.total} ${data.total === 1 ? 'ticket' : 'tickets'}`
              : 'Support requests received by email'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TicketsFilters
            filters={filters}
            onChange={(next) => {
              setFilters(next)
              // Search resets the page itself once its debounce fires
              if (next.status !== filters.status || next.category !== filters.category) setPage(1)
            }}
          />
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
            <p className="text-sm text-muted-foreground">
              {isFiltered ? 'No tickets match your filters.' : 'No tickets yet.'}
            </p>
          ) : (
            <>
              <TicketsTable
                tickets={tickets}
                sorting={sorting}
                onSortingChange={(updater) => {
                  setSorting(updater)
                  setPage(1)
                }}
              />
              <TicketsPagination
                page={page}
                pageCount={pageCount}
                pageSize={DEFAULT_PAGE_SIZE}
                total={data.total}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
