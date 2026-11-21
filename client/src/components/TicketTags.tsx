import { TicketPriority, TicketSentiment } from '@helpdesk/core'
import { Frown, Meh, Smile } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/i18n/use-language'

const priorityVariants: Record<TicketPriority, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  [TicketPriority.URGENT]: 'destructive',
  [TicketPriority.HIGH]: 'default',
  [TicketPriority.MEDIUM]: 'secondary',
  [TicketPriority.LOW]: 'outline',
}

const sentimentIcons = {
  [TicketSentiment.POSITIVE]: Smile,
  [TicketSentiment.NEUTRAL]: Meh,
  [TicketSentiment.NEGATIVE]: Frown,
}

const sentimentColors: Record<TicketSentiment, string> = {
  [TicketSentiment.POSITIVE]: 'text-ai',
  [TicketSentiment.NEUTRAL]: 'text-muted-foreground',
  [TicketSentiment.NEGATIVE]: 'text-destructive',
}

// A muted dash for a value the AI hasn't set yet, readable by screen readers as "Not set"
function NotSet() {
  const { t } = useLanguage()
  return (
    <span className="text-muted-foreground" title={t.notSet}>
      <span aria-hidden="true">–</span>
      <span className="sr-only">{t.notSet}</span>
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: TicketPriority | null }) {
  const { t } = useLanguage()
  if (!priority) return <NotSet />
  return <Badge variant={priorityVariants[priority]}>{t.priorities[priority]}</Badge>
}

// An icon whose colour follows the tone. The word is always there for screen readers and the tooltip,
// and shown next to the icon when `showLabel` is set (the ticket page)
export function SentimentIcon({ sentiment, showLabel = false }: { sentiment: TicketSentiment | null; showLabel?: boolean }) {
  const { t } = useLanguage()
  if (!sentiment) return <NotSet />
  const Icon = sentimentIcons[sentiment]
  const label = t.sentiments[sentiment]
  return (
    <span className={`inline-flex items-center gap-1.5 ${sentimentColors[sentiment]}`} title={label}>
      <Icon className="size-4" aria-hidden="true" />
      <span className={showLabel ? 'text-sm' : 'sr-only'}>{label}</span>
    </span>
  )
}
