import axios from 'axios'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useUsers } from '@/hooks/use-users'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export default function UsersPage() {
  const { data: users, error } = useUsers()

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            <h1>Users</h1>
          </CardTitle>
          <CardDescription>
            {users ? `${users.length} ${users.length === 1 ? 'user' : 'users'}` : 'Admins and agents with access to Helpdesk'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {axios.isAxiosError(error) && error.response?.status === 403
                  ? 'You do not have access to this page'
                  : 'Failed to load users'}
              </AlertDescription>
            </Alert>
          ) : !users ? (
            <div role="status" aria-label="Loading users" className="space-y-3">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-1/5" />
                  <Skeleton className="h-5 w-2/5" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-1/6" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </main>
  )
}
