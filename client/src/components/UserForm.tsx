import { useState, type FormEvent } from 'react'
import axios from 'axios'
import { createUserSchema, updateUserSchema, type CreateUserInput } from '@helpdesk/core'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DialogClose, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateUser, useUpdateUser, type User } from '@/hooks/use-users'

type FieldName = 'name' | 'email' | 'password'
type FieldErrors = Partial<Record<FieldName, string>>

function firstErrors(fieldErrors: Partial<Record<string, string[]>>): FieldErrors {
  return {
    name: fieldErrors.name?.[0],
    email: fieldErrors.email?.[0],
    password: fieldErrors.password?.[0],
  }
}

// Creates a user, or edits `user` when given (blank password = keep the current one).
// Must render inside a Dialog: the Cancel button is a DialogClose
export function UserForm({ user, onDone }: { user?: User; onDone: () => void }) {
  const isEdit = user !== undefined
  const [values, setValues] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string>()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser(user?.id ?? '')
  const isPending = isEdit ? updateUser.isPending : createUser.isPending

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(undefined)
    const parsed = (isEdit ? updateUserSchema : createUserSchema).safeParse(values)
    if (!parsed.success) {
      setErrors(firstErrors(z.flattenError(parsed.error).fieldErrors))
      return
    }
    setErrors({})
    const options = {
      onSuccess: onDone,
      onError: (error: Error) => {
        const serverErrors = axios.isAxiosError(error) ? error.response?.data?.fieldErrors : undefined
        if (serverErrors) {
          setErrors(firstErrors(serverErrors))
        } else {
          setFormError(isEdit ? 'Failed to save user' : 'Failed to create user')
        }
      },
    }
    if (isEdit) {
      updateUser.mutate(parsed.data, options)
    } else {
      createUser.mutate(parsed.data as CreateUserInput, options)
    }
  }

  function field(name: FieldName, label: string, type = 'text', autoComplete = 'off', hint?: string) {
    const error = errors[name]
    const hintId = `user-form-${name}-hint`
    const errorId = `user-form-${name}-error`
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`user-form-${name}`}>{label}</Label>
        <Input
          id={`user-form-${name}`}
          type={type}
          autoComplete={autoComplete}
          value={values[name]}
          onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
          aria-invalid={error ? true : undefined}
          aria-describedby={[error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined}
        />
        {hint && (
          <p id={hintId} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-sm text-destructive">
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
      {field('password', 'Password', 'password', 'new-password', isEdit ? 'Leave blank to keep the current password' : undefined)}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={isPending}>
          {isPending ? (isEdit ? 'Saving...' : 'Creating...') : isEdit ? 'Save changes' : 'Create user'}
        </Button>
      </DialogFooter>
    </form>
  )
}
