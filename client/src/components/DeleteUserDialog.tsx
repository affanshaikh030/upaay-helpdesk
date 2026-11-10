import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDeleteUser, type User } from '@/hooks/use-users'

function DeleteUserConfirm({ user, onDone }: { user: User; onDone: () => void }) {
  const [error, setError] = useState(false)
  const deleteUser = useDeleteUser()

  return (
    <>
      <DialogHeader>
        <DialogTitle>Delete user</DialogTitle>
        <DialogDescription>
          Delete {user.name} ({user.email})? They will be signed out and won't be able to sign in again.
        </DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>Failed to delete user</AlertDescription>
        </Alert>
      )}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button
          type="button"
          variant="destructive"
          disabled={deleteUser.isPending}
          onClick={() => {
            setError(false)
            deleteUser.mutate(user.id, { onSuccess: onDone, onError: () => setError(true) })
          }}
        >
          {deleteUser.isPending ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogFooter>
    </>
  )
}

// Confirmation before soft-deleting `user`
export function DeleteUserDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Unmounts on close, so the error state resets each time */}
        {user && <DeleteUserConfirm key={user.id} user={user} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
