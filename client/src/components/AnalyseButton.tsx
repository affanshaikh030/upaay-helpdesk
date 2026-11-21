import { Button } from '@/components/ui/button'
import { useIsAdmin } from '@/hooks/use-is-admin'
import { useReanalyseTickets } from '@/hooks/use-tickets'
import { useLanguage } from '@/i18n/use-language'

// Admin only (renders nothing for agents). With a ticketId it re-runs the AI analysis for that ticket; without one it
// queues the oldest tickets that still have no priority or sentiment, up to the server's per-request limit
export function AnalyseButton({ ticketId, className = 'space-y-1.5' }: { ticketId?: number; className?: string }) {
  const isAdmin = useIsAdmin()
  const { t } = useLanguage()
  const reanalyse = useReanalyseTickets()
  if (!isAdmin) return null

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-auto w-full py-1.5 whitespace-normal"
        disabled={reanalyse.isPending}
        onClick={() => reanalyse.mutate(ticketId === undefined ? {} : { ticketIds: [ticketId] })}
      >
        {reanalyse.isPending ? t.analysing : ticketId === undefined ? t.analyseUntagged : t.analyse}
      </Button>
      {reanalyse.isError && (
        <p role="alert" className="text-xs text-destructive">
          {t.analysisFailed}
        </p>
      )}
      {reanalyse.data && (
        <p role="status" className="text-xs text-muted-foreground">
          {reanalyse.data.queued > 0 ? t.analysisQueued(reanalyse.data.queued) : t.analysisNone}
        </p>
      )}
    </div>
  )
}
