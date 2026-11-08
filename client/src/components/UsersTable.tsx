import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { User } from '@/hooks/use-users'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export function UsersTable({ users }: { users: User[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                {user.role === 'ADMIN' ? 'Admin' : 'Agent'}
              </Badge>
            </TableCell>
            <TableCell>{dateFormat.format(new Date(user.createdAt))}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
