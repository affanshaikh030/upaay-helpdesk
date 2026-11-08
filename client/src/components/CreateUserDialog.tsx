import { CreateUserForm } from '@/components/CreateUserForm'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New user</DialogTitle>
          <DialogDescription>
            Create an agent account. They can sign in with this email and password.
          </DialogDescription>
        </DialogHeader>
        {/* Unmounts on close, so the form resets each time the dialog opens */}
        <CreateUserForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
