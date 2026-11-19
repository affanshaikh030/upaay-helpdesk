import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TicketsPerDayChart } from '@/components/TicketsPerDayChart'
import { Skeleton } from '@/components/ui/skeleton'
import { useStats } from '@/hooks/use-stats'
import { useLanguage } from '@/i18n/use-language'

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
  const { t } = useLanguage()

  const cards = data && [
    { label: t.statTotal, value: data.total.toLocaleString() },
    { label: t.statOpen, value: data.open.toLocaleString() },
    { label: t.statResolvedByAi, value: data.resolvedByAi.toLocaleString(), ai: true },
    { label: t.statResolvedByAiPercent, value: `${data.aiResolvedPercent}%` },
    {
      label: t.statAvgResolution,
      value: data.avgResolutionSeconds === null ? '-' : formatDuration(data.avgResolutionSeconds),
    },
  ]

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t.dashboardTitle}</h1>
      <p className="mt-1 mb-6 text-muted-foreground">{t.dashboardSubtitle}</p>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{t.statsLoadFailed}</AlertDescription>
        </Alert>
      ) : !cards ? (
        <div role="status" aria-label={t.statsLoading} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* gap-px over a border-coloured background draws the hairline dividers at every breakpoint */}
          <dl className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-5">
            {cards.map((card) => (
              <div key={card.label} className="bg-card p-5 last:sm:col-span-2 last:lg:col-span-1">
                <dt className="text-sm text-muted-foreground">{card.label}</dt>
                <dd
                  className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums ${card.ai ? 'text-ai' : 'text-card-foreground'}`}
                >
                  {card.value}
                </dd>
              </div>
            ))}
          </dl>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>
                <h2>{t.ticketsPerDayTitle}</h2>
              </CardTitle>
              <CardDescription>{t.ticketsPerDayDescription}</CardDescription>
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
