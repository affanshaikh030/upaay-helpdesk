import { TicketStatus } from '@helpdesk/core'
import {
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Ticket } from '@/hooks/use-tickets'
import type { Dictionary } from '@/i18n/translations'
import { useLanguage } from '@/i18n/use-language'
import { categoryLabels, statusLabels } from '@/lib/ticket-labels'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

const statusVariants: Record<TicketStatus, 'default' | 'secondary' | 'outline'> = {
  [TicketStatus.OPEN]: 'default',
  [TicketStatus.RESOLVED]: 'secondary',
  [TicketStatus.CLOSED]: 'outline',
}

const buildColumns = (t: Dictionary): ColumnDef<Ticket>[] => [
  {
    accessorKey: 'subject',
    header: t.columnSubject,
    cell: ({ row }) => (
      <Link
        to={`/tickets/${row.original.id}`}
        title={row.original.subject}
        className="block max-w-48 truncate font-medium hover:underline"
      >
        {row.original.subject}
      </Link>
    ),
  },
  {
    accessorKey: 'fromName',
    header: t.columnFrom,
    cell: ({ row }) => (
      <>
        <div>{row.original.fromName}</div>
        <div className="text-xs text-muted-foreground">{row.original.fromEmail}</div>
      </>
    ),
  },
  {
    accessorKey: 'status',
    header: t.columnStatus,
    cell: ({ row }) => (
      <Badge variant={statusVariants[row.original.status]}>{statusLabels[row.original.status]}</Badge>
    ),
  },
  {
    accessorKey: 'category',
    header: t.columnCategory,
    cell: ({ row }) =>
      row.original.category ? (
        categoryLabels[row.original.category]
      ) : (
        <span className="text-muted-foreground">{t.uncategorized}</span>
      ),
  },
  {
    id: 'assignedTo',
    header: t.columnAssignedTo,
    enableSorting: false,
    cell: ({ row }) =>
      row.original.assignedTo ? (
        row.original.assignedTo.name
      ) : (
        <span className="text-muted-foreground">{t.unassigned}</span>
      ),
  },
  {
    accessorKey: 'createdAt',
    header: t.columnCreated,
    // Never let the date shrink or wrap: below this width the table scrolls instead
    cell: ({ row }) => (
      <span className="inline-block min-w-44 whitespace-nowrap">{dateFormat.format(new Date(row.original.createdAt))}</span>
    ),
  },
]

type TicketsTableProps = {
  tickets: Ticket[]
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
}

// Sorting is done by the API: the rows arrive already sorted and the table only reports clicks
export function TicketsTable({ tickets, sorting, onSortingChange }: TicketsTableProps) {
  const { t } = useLanguage()
  const columns = useMemo(() => buildColumns(t), [t])
  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    enableSortingRemoval: false,
    enableMultiSort: false,
    getRowId: (ticket) => String(ticket.id),
  })

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const sorted = header.column.getIsSorted()
              const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown
              return (
                <TableHead
                  key={header.id}
                  aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}
                >
                  {header.column.getCanSort() ? (
                    <button
                      type="button"
                      className="-ml-2 inline-flex cursor-pointer items-center gap-1 rounded px-2 py-1 hover:bg-muted"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <Icon className={sorted ? 'size-4' : 'size-4 text-muted-foreground'} aria-hidden />
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              )
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
