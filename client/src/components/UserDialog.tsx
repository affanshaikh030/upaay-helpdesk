import { UserForm } from '@/components/UserForm'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { User } from '@/hooks/use-users'

// Create a user, or edit `user` when given
export function UserDialog({
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
        <DialogHeader>
          <DialogTitle>{user ? 'Edit user' : 'New user'}</DialogTitle>
          <DialogDescription>
            {user
              ? 'Update this user. Leave the password blank to keep it unchanged.'
              : 'Create an agent account. They can sign in with this email and password.'}
          </DialogDescription>
        </DialogHeader>
        {/* Unmounts on close, so the form resets each time the dialog opens */}
        <UserForm key={user?.id} user={user} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
