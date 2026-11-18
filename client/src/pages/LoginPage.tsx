import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { authClient } from '../lib/auth-client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Field = 'email' | 'password'
type FieldErrors = Partial<Record<Field, string>>

export default function LoginPage() {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  if (isPending) return null
  if (session) return <Navigate to="/" replace />

  const clearFieldError = (field: Field) =>
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }))

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email')).trim()
    const password = String(form.get('password'))

    const errors: FieldErrors = {}
    if (!email) errors.email = 'Email is required'
    else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email address'
    if (!password) errors.password = 'Password is required'

    setError(null)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    const { error } = await authClient.signIn.email({ email, password })
    setSubmitting(false)

    if (error) {
      // The server doesn't say which credential was wrong, so flag both
      setError(error.message || 'Invalid email or password')
      setFieldErrors({ email: ' ', password: ' ' })
      return
    }
    navigate('/')
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <p className="text-lg font-semibold tracking-tight">Helpdesk</p>
        <p className="max-w-sm text-2xl leading-snug font-semibold tracking-tight">
          Support tickets from email, classified and answered with AI.
        </p>
      </aside>
      <div className="flex items-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold tracking-tight">Sign in to Helpdesk</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Enter your email and password to continue.
          </p>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                aria-invalid={!!fieldErrors.email}
                onChange={() => clearFieldError('email')}
              />
              {fieldErrors.email?.trim() && (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!fieldErrors.password}
                onChange={() => clearFieldError('password')}
              />
              {fieldErrors.password?.trim() && (
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              )}
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
