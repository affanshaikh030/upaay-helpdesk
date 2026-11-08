import { useState, type FormEvent } from 'react'
import axios from 'axios'
import { z } from 'zod'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateUser } from '@/hooks/use-users'

const createUserSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters'),
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FieldName = 'name' | 'email' | 'password'
type FieldErrors = Partial<Record<FieldName, string>>

function firstErrors(fieldErrors: Partial<Record<string, string[]>>): FieldErrors {
  return {
    name: fieldErrors.name?.[0],
    email: fieldErrors.email?.[0],
    password: fieldErrors.password?.[0],
  }
}

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string>()
  const createUser = useCreateUser()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(undefined)
    const parsed = createUserSchema.safeParse(values)
    if (!parsed.success) {
      setErrors(firstErrors(z.flattenError(parsed.error).fieldErrors))
      return
    }
    setErrors({})
    createUser.mutate(parsed.data, {
      onSuccess: onDone,
      onError: (error) => {
        const serverErrors = axios.isAxiosError(error) ? error.response?.data?.fieldErrors : undefined
        if (serverErrors) {
          setErrors(firstErrors(serverErrors))
        } else {
          setFormError('Failed to create user')
        }
      },
    })
  }

  function field(name: FieldName, label: string, type = 'text', autoComplete = 'off') {
    const error = errors[name]
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`new-user-${name}`}>{label}</Label>
        <Input
          id={`new-user-${name}`}
          type={type}
          autoComplete={autoComplete}
          value={values[name]}
          onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `new-user-${name}-error` : undefined}
        />
        {error && (
          <p id={`new-user-${name}-error`} className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      {field('name', 'Name')}
      {field('email', 'Email', 'email')}
      {field('password', 'Password', 'password', 'new-password')}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={createUser.isPending}>
          {createUser.isPending ? 'Creating...' : 'Create user'}
        </Button>
      </DialogFooter>
    </form>
  )
}

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
