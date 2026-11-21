import { useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { SenderType, createReplySchema, polishReplySchema } from '@helpdesk/core'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useCreateReply, usePolishReply, useReplies, type TicketDetail } from '@/hooks/use-tickets'
import { useLanguage } from '@/i18n/use-language'

function errorMessage(error: unknown, fallback: string) {
  return isAxiosError(error) && typeof error.response?.data?.error === 'string' ? error.response.data.error : fallback
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const textareaClass =
  'block min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30'

// Replies on a ticket, oldest first, with a form to add one
export function ReplyThread({ ticket }: { ticket: Pick<TicketDetail, 'id' | 'subject' | 'fromName' | 'body' | 'resolvedByAi'> }) {
  const ticketId = ticket.id
  const { t } = useLanguage()
  const { data: replies, error } = useReplies(String(ticketId))
  const createReply = useCreateReply(ticketId)
  const polishReply = usePolishReply(ticketId)
  const [body, setBody] = useState('')
  const [validationError, setValidationError] = useState<string>()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = createReplySchema.safeParse({ body })
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0].message)
      return
    }
    setValidationError(undefined)
    createReply.mutate(parsed.data, { onSuccess: () => setBody('') })
  }

  function handlePolish() {
    const parsed = polishReplySchema.safeParse({
      subject: ticket.subject,
      customerName: ticket.fromName,
      customerMessage: ticket.body,
      draft: body,
    })
    if (!parsed.success) {
      setValidationError(parsed.error.issues.find((i) => i.path[0] === 'draft')?.message ?? 'Failed to polish reply')
      return
    }
    setValidationError(undefined)
    polishReply.mutate(parsed.data, { onSuccess: (data) => setBody(data.body) })
  }

  const busy = createReply.isPending || polishReply.isPending
  const serverError = errorMessage(createReply.error, 'Failed to send reply')
  const polishError = errorMessage(polishReply.error, 'Failed to polish reply')

  return (
    <section aria-labelledby="replies-heading" className="space-y-4">
      <h2 id="replies-heading" className="text-lg font-semibold">
        Replies
      </h2>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>Failed to load replies</AlertDescription>
        </Alert>
      ) : !replies ? (
        <div role="status" aria-label="Loading replies" className="space-y-3">
          <Skeleton className="h-16 w-full" />
        </div>
      ) : replies.length === 0 ? (
        <p className="text-sm text-muted-foreground">No replies yet</p>
      ) : (
        <ul className="space-y-3">
          {replies.map((reply) => (
            <li
              key={reply.id}
              className={`rounded-lg border p-4 ${reply.senderType === SenderType.CUSTOMER ? 'bg-muted/40' : ''}`}
            >
              <p className="mb-2 text-xs text-muted-foreground">
                {reply.senderType === SenderType.CUSTOMER ? 'Customer' : (reply.author?.name ?? (ticket.resolvedByAi ? 'AI assistant' : 'Former agent'))} ·{' '}
                {dateFormat.format(new Date(reply.createdAt))}
              </p>
              <p className="whitespace-pre-wrap text-sm">{reply.body}</p>
              {/* Plain text, not a link: the article page is for admins only, and a deleted article has no source to show */}
              {reply.sourceArticle && (
                <p className="mt-2 text-xs text-muted-foreground">{t.basedOn(reply.sourceArticle.title)}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} noValidate className="space-y-2">
        <Label htmlFor="reply-body">Reply</Label>
        <textarea
          id="reply-body"
          className={textareaClass}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={busy}
          aria-invalid={validationError !== undefined}
          aria-describedby={validationError ? 'reply-error' : undefined}
        />
        {validationError && (
          <p id="reply-error" className="text-sm text-destructive">
            {validationError}
          </p>
        )}
        {createReply.isError && <p className="text-sm text-destructive">{serverError}</p>}
        {polishReply.isError && <p className="text-sm text-destructive">{polishError}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handlePolish} disabled={busy || body.trim() === ''}>
            {polishReply.isPending ? 'Polishing…' : 'Polish'}
          </Button>
          <Button type="submit" disabled={busy || body.trim() === ''}>
            {createReply.isPending ? 'Sending…' : 'Send reply'}
          </Button>
        </div>
      </form>
    </section>
  )
}
