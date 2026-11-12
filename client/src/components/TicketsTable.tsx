import { TicketCategory, TicketStatus } from '@helpdesk/core'
import {
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Ticket } from '@/hooks/use-tickets'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

const statusLabels: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'Open',
  [TicketStatus.RESOLVED]: 'Resolved',
  [TicketStatus.CLOSED]: 'Closed',
}

const statusVariants: Record<TicketStatus, 'default' | 'secondary' | 'outline'> = {
  [TicketStatus.OPEN]: 'default',
  [TicketStatus.RESOLVED]: 'secondary',
  [TicketStatus.CLOSED]: 'outline',
}

const categoryLabels: Record<TicketCategory, string> = {
  [TicketCategory.GENERAL_QUESTION]: 'General question',
  [TicketCategory.TECHNICAL_QUESTION]: 'Technical question',
  [TicketCategory.REFUND_REQUEST]: 'Refund request',
}

const columns: ColumnDef<Ticket>[] = [
  {
    accessorKey: 'subject',
    header: 'Subject',
    cell: ({ row }) => <span className="block max-w-xs truncate font-medium">{row.original.subject}</span>,
  },
  {
    accessorKey: 'fromName',
    header: 'From',
    cell: ({ row }) => (
      <>
        <div>{row.original.fromName}</div>
        <div className="text-xs text-muted-foreground">{row.original.fromEmail}</div>
      </>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={statusVariants[row.original.status]}>{statusLabels[row.original.status]}</Badge>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) =>
      row.original.category ? (
        categoryLabels[row.original.category]
      ) : (
        <span className="text-muted-foreground">Uncategorized</span>
      ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => <span className="whitespace-nowrap">{dateFormat.format(new Date(row.original.createdAt))}</span>,
  },
]

type TicketsTableProps = {
  tickets: Ticket[]
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
}

// Sorting is done by the API: the rows arrive already sorted and the table only reports clicks
export function TicketsTable({ tickets, sorting, onSortingChange }: TicketsTableProps) {
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
                  <button
                    type="button"
                    className="-ml-2 inline-flex cursor-pointer items-center gap-1 rounded px-2 py-1 hover:bg-muted"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    <Icon className={sorted ? 'size-4' : 'size-4 text-muted-foreground'} aria-hidden />
                  </button>
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
