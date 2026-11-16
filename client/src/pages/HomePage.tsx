import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TicketsPerDayChart } from '@/components/TicketsPerDayChart'
import { Skeleton } from '@/components/ui/skeleton'
import { useStats } from '@/hooks/use-stats'

// 90 -> "1m", 8100 -> "2h 15m", 100000 -> "1d 4h": the two largest non-zero units
function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60)
  if (minutes < 1) return '<1m'
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  return `${mins}m`
}

export default function HomePage() {
  const { data, error } = useStats()

  const cards = data && [
    { label: 'Total tickets', value: data.total.toLocaleString() },
    { label: 'Open tickets', value: data.open.toLocaleString() },
    { label: 'Resolved by AI', value: data.resolvedByAi.toLocaleString() },
    { label: '% resolved by AI', value: `${data.aiResolvedPercent}%` },
    {
      label: 'Average resolution time',
      value: data.avgResolutionSeconds === null ? '-' : formatDuration(data.avgResolutionSeconds),
    },
  ]

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <p className="mt-1 mb-6 text-gray-600">Ticket overview, including tickets resolved by AI.</p>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>Failed to load stats</AlertDescription>
        </Alert>
      ) : !cards ? (
        <div role="status" aria-label="Loading stats" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <Card key={card.label}>
                <CardHeader>
                  <CardDescription>
                    <dt>{card.label}</dt>
                  </CardDescription>
                  <CardTitle className="text-3xl">
                    <dd>{card.value}</dd>
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </dl>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>
                <h2>Tickets per day</h2>
              </CardTitle>
              <CardDescription>New tickets received over the last 30 days (UTC)</CardDescription>
            </CardHeader>
            <CardContent>
              <TicketsPerDayChart days={data.ticketsPerDay} />
            </CardContent>
          </Card>
        </>
      )}
    </main>
  )
}
