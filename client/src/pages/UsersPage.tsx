import { useState } from 'react'
import axios from 'axios'
import { DeleteUserDialog } from '@/components/DeleteUserDialog'
import { UserDialog } from '@/components/UserDialog'
import { UsersTable } from '@/components/UsersTable'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useUsers, type User } from '@/hooks/use-users'

export default function UsersPage() {
  const { data: users, error } = useUsers()
  const [dialogOpen, setDialogOpen] = useState(false)
  // Kept after the dialog closes so its title doesn't flip during the exit animation
  const [editingUser, setEditingUser] = useState<User>()

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState<User>()

  function confirmDelete(user: User) {
    setDeletingUser(user)
    setDeleteOpen(true)
  }

  function openDialog(user?: User) {
    setEditingUser(user)
    setDialogOpen(true)
  }

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
          <div className="mb-4 flex justify-end">
            <Button onClick={() => openDialog()}>New user</Button>
          </div>
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
            <UsersTable users={users} onEdit={openDialog} onDelete={confirmDelete} />
          )}
        </CardContent>
      </Card>
      <DeleteUserDialog open={deleteOpen} onOpenChange={setDeleteOpen} user={deletingUser} />
      <UserDialog open={dialogOpen} onOpenChange={setDialogOpen} user={editingUser} />
    </main>
  )
}
