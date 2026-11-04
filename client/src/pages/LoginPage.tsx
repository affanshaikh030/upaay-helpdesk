import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { authClient } from '../lib/auth-client'

type Field = 'email' | 'password'
type FieldErrors = Partial<Record<Field, string>>

const inputBase =
  'mt-1 block w-full rounded-md border px-3 py-2 text-gray-900 focus:outline-none focus:ring-1'
const inputValid = 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
const inputInvalid = 'border-red-500 focus:border-red-500 focus:ring-red-500'

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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-gray-900">Sign in to Helpdesk</h1>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <label className="block text-sm font-medium text-gray-700">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!fieldErrors.email}
            onChange={() => clearFieldError('email')}
            className={`${inputBase} ${fieldErrors.email ? inputInvalid : inputValid}`}
          />
          {fieldErrors.email?.trim() && (
            <span className="mt-1 block text-xs font-normal text-red-600">{fieldErrors.email}</span>
          )}
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!fieldErrors.password}
            onChange={() => clearFieldError('password')}
            className={`${inputBase} ${fieldErrors.password ? inputInvalid : inputValid}`}
          />
          {fieldErrors.password?.trim() && (
            <span className="mt-1 block text-xs font-normal text-red-600">
              {fieldErrors.password}
            </span>
          )}
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
