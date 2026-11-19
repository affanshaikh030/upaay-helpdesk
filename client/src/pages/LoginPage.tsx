import { Eye, EyeOff, Inbox } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { authClient } from '../lib/auth-client'
import { BRAND_NAME } from '../lib/brand'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useLanguage } from '@/i18n/use-language'

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
  const { language, setLanguage, t } = useLanguage()

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
    if (!email) errors.email = t.emailRequired
    else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = t.emailInvalid
    if (!password) errors.password = t.passwordRequired

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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-white/10 bg-neutral-950 px-4 py-3 text-white sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-white text-neutral-950">
            <Inbox className="size-4" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">{BRAND_NAME}</span>
        </div>
        <LanguageSwitcher value={language} onChange={setLanguage} label={t.language} />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 text-card-foreground">
          <h1 className="text-xl font-semibold tracking-tight">{t.signInTo(BRAND_NAME)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>
          <p className="mt-4 mb-6 text-sm text-muted-foreground">{t.subtitle}</p>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t.email}</Label>
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
              <Label htmlFor="password">{t.password}</Label>
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
                  aria-label={showPassword ? t.hidePassword : t.showPassword}
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
                  {t.capsLockOn}
                </p>
              )}
              {fieldErrors.password?.trim() && (
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              )}
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? t.signingIn : t.signIn}
            </Button>
          </form>
        </div>
      </main>

      <footer className="border-t border-white/10 bg-neutral-950 px-4 py-4 text-center text-xs text-neutral-300">
        © {BRAND_NAME}
      </footer>
    </div>
  )
}
