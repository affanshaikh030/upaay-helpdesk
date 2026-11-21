import { AutoResolveDecision } from '@helpdesk/core'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { KnowledgeAttempt } from '@/hooks/use-knowledge'
import { useLanguage } from '@/i18n/use-language'

// A muted dash for a value that doesn't exist (the AI was not called, so there is no rank, confidence or draft)
function Dash() {
  const { t } = useLanguage()
  return (
    <span className="text-muted-foreground" title={t.notSet}>
      <span aria-hidden="true">–</span>
      <span className="sr-only">{t.notSet}</span>
    </span>
  )
}

const score = (value: number | null) => (value === null ? <Dash /> : value.toFixed(2))

// What the auto-resolve job did for each ticket; in shadow mode, what it would have done
export function AttemptsTable({ attempts }: { attempts: KnowledgeAttempt[] }) {
  const { t } = useLanguage()
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t.columnTicket}</TableHead>
          <TableHead>{t.columnDecision}</TableHead>
          <TableHead>{t.columnReason}</TableHead>
          <TableHead>{t.columnTopRank}</TableHead>
          <TableHead>{t.columnConfidence}</TableHead>
          <TableHead>{t.columnDraftReply}</TableHead>
          <TableHead>{t.columnCitedArticle}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {attempts.map((attempt) => (
          <TableRow key={attempt.id}>
            <TableCell className="max-w-48 truncate" title={attempt.ticketSubject}>
              <Link to={`/tickets/${attempt.ticketId}`} className="font-medium hover:underline">
                {attempt.ticketSubject}
              </Link>
            </TableCell>
            <TableCell>
              <div className="flex flex-col items-start gap-1">
                <Badge variant={attempt.decision === AutoResolveDecision.RESOLVE ? 'default' : 'secondary'}>
                  {t.decisions[attempt.decision]}
                </Badge>
                <span className="text-xs text-muted-foreground">{attempt.shadow ? t.modeShadow : t.modeLive}</span>
              </div>
            </TableCell>
            <TableCell className="whitespace-normal">{t.autoResolveReasons[attempt.reason]}</TableCell>
            <TableCell>{score(attempt.topRank)}</TableCell>
            <TableCell>{score(attempt.confidence)}</TableCell>
            <TableCell className="max-w-xs whitespace-normal">
              {attempt.draftReply ? (
                <span className="line-clamp-3" title={attempt.draftReply}>
                  {attempt.draftReply}
                </span>
              ) : (
                <Dash />
              )}
            </TableCell>
            <TableCell className="whitespace-normal">
              {attempt.citedArticles.length === 0 ? (
                <Dash />
              ) : (
                attempt.citedArticles.map((article, index) => (
                  <span key={article.id}>
                    {index > 0 && ', '}
                    {article.title ?? <span className="text-muted-foreground">{t.deletedArticle}</span>}
                  </span>
                ))
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
