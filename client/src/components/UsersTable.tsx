import { Role } from '@helpdesk/core'
import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { User } from '@/hooks/use-users'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export function UsersTable({
  users,
  onEdit,
  onDelete,
}: {
  users: User[]
  onEdit: (user: User) => void
  onDelete: (user: User) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-24">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Badge variant={user.role === Role.ADMIN ? 'default' : 'secondary'}>
                {user.role === Role.ADMIN ? 'Admin' : 'Agent'}
              </Badge>
            </TableCell>
            <TableCell>{dateFormat.format(new Date(user.createdAt))}</TableCell>
            <TableCell className="whitespace-nowrap">
              <Button variant="ghost" size="icon-sm" aria-label={`Edit ${user.name}`} onClick={() => onEdit(user)}>
                <Pencil />
              </Button>
              {/* Admins can't be deleted */}
              {user.role !== Role.ADMIN && (
                <Button variant="ghost" size="icon-sm" aria-label={`Delete ${user.name}`} onClick={() => onDelete(user)}>
                  <Trash2 />
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
