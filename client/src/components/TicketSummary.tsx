import { isAxiosError } from 'axios'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSummarizeTicket } from '@/hooks/use-tickets'

function errorMessage(error: unknown, fallback: string) {
  return isAxiosError(error) && typeof error.response?.data?.error === 'string' ? error.response.data.error : fallback
}

// AI summary of the ticket and its replies; every click generates a fresh one
export function TicketSummary({ ticketId }: { ticketId: number }) {
  const summarize = useSummarizeTicket(ticketId)

  return (
    <div className="mt-4 space-y-3">
      <Button type="button" variant="outline" size="sm" onClick={() => summarize.mutate()} disabled={summarize.isPending}>
        <Sparkles aria-hidden />
        {summarize.isPending ? 'Summarising…' : 'Summarise'}
      </Button>
      {summarize.isError && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(summarize.error, 'Failed to summarise the ticket')}
        </p>
      )}
      {summarize.data && !summarize.isPending && (
        <div className="rounded-lg border bg-muted/40 p-3">
          <h2 className="mb-1 text-xs font-medium text-muted-foreground">Summary</h2>
          <p className="whitespace-pre-wrap text-sm">{summarize.data.summary}</p>
        </div>
      )}
    </div>
  )
}
