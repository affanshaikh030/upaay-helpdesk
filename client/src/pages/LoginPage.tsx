import { Eye, EyeOff, Inbox } from 'lucide-react'
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
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)

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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 py-12">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Inbox className="size-5" aria-hidden="true" />
        </span>
        <span className="text-lg font-semibold tracking-tight">Helpdesk</span>
      </div>
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 text-card-foreground">
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
              autoFocus
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
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                aria-invalid={!!fieldErrors.password}
                className="pr-10"
                onChange={() => clearFieldError('password')}
                onKeyDown={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                onBlur={() => setCapsLock(false)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-1 my-auto flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {capsLock && (
              <p role="status" className="text-xs text-muted-foreground">
                Caps Lock is on
              </p>
            )}
            {fieldErrors.password?.trim() && (
              <p className="text-xs text-destructive">{fieldErrors.password}</p>
            )}
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
      <p className="text-xs text-muted-foreground">© Helpdesk</p>
    </main>
  )
}
