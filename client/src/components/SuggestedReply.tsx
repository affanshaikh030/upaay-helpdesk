import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useSuggestedReply } from '@/hooks/use-tickets'
import { useLanguage } from '@/i18n/use-language'

// The AI's draft answer, offered to the agent before anything has been said on the ticket. It only reads and fills the
// reply box through onUse: it never sends, resolves or changes the ticket. Dismiss hides it for this page view
export function SuggestedReply({
  ticketId,
  hasNoReplies,
  onUse,
}: {
  ticketId: number
  hasNoReplies: boolean
  onUse: (text: string) => void
}) {
  const { t } = useLanguage()
  const [dismissed, setDismissed] = useState(false)
  const { data: suggestion } = useSuggestedReply(ticketId, hasNoReplies && !dismissed)

  if (!hasNoReplies || dismissed || !suggestion) return null

  return (
    <section aria-labelledby="suggested-reply-heading" className="space-y-2 rounded-lg border border-dashed p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="suggested-reply-heading" className="text-sm font-semibold">
          {t.suggestedReplyTitle}
        </h3>
        <span className="text-xs text-muted-foreground">{t.aiDraftLabel}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm">{suggestion.draftReply}</p>
      {/* Plain text, not a link: the article page is for admins only */}
      {suggestion.article && <p className="text-xs text-muted-foreground">{t.basedOn(suggestion.article.title)}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={() => onUse(suggestion.draftReply)}>
          {t.useThisReply}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setDismissed(true)}>
          {t.dismissSuggestion}
        </Button>
      </div>
    </section>
  )
}
