import { Button } from '@/components/ui/button'
import { useLanguage } from '@/i18n/use-language'

type Props = {
  page: number
  pageCount: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function TicketsPagination({ page, pageCount, pageSize, total, onPageChange }: Props) {
  const { t } = useLanguage()
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <nav aria-label={t.paginationLabel} className="mt-4 flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">{t.showing(from, to, total)}</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          {t.previous}
        </Button>
        <span className="text-sm">{t.pageOf(page, pageCount)}</span>
        <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
          {t.next}
        </Button>
      </div>
    </nav>
  )
}
