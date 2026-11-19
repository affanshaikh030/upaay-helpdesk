import { UNCATEGORIZED, type TicketCategory, type TicketStatus } from '@helpdesk/core'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/i18n/use-language'
import { categoryLabels, statusLabels } from '@/lib/ticket-labels'

export type TicketFilters = {
  search: string
  status: TicketStatus | ''
  category: TicketCategory | typeof UNCATEGORIZED | ''
}

export const emptyFilters: TicketFilters = { search: '', status: '', category: '' }

const selectClass =
  'h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30'

type Props = { filters: TicketFilters; onChange: (filters: TicketFilters) => void }

export function TicketsFilters({ filters, onChange }: Props) {
  const { t } = useLanguage()

  return (
    <div className="mb-4 flex flex-wrap items-end gap-4">
      <div className="min-w-48 flex-1 space-y-1.5">
        <Label htmlFor="ticket-search">{t.search}</Label>
        <Input
          id="ticket-search"
          type="search"
          placeholder={t.searchPlaceholder}
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ticket-status">{t.filterStatus}</Label>
        <select
          id="ticket-status"
          className={selectClass}
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value as TicketFilters['status'] })}
        >
          <option value="">{t.allStatuses}</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ticket-category">{t.filterCategory}</Label>
        <select
          id="ticket-category"
          className={selectClass}
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value as TicketFilters['category'] })}
        >
          <option value="">{t.allCategories}</option>
          {Object.entries(categoryLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
          <option value={UNCATEGORIZED}>{t.uncategorized}</option>
        </select>
      </div>
    </div>
  )
}
