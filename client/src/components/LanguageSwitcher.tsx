import { LANGUAGES, type Language } from '@/i18n/translations'

const variants = {
  // Always-dark bars, such as the login page header
  dark: 'border-white/20 bg-neutral-900 px-2 py-1.5 text-sm text-white [color-scheme:dark]',
  // Follows the light/dark theme, compact for the app header
  theme: 'border-border bg-card px-1.5 py-1 text-xs text-foreground',
}

export function LanguageSwitcher({
  value,
  onChange,
  label,
  variant = 'dark',
}: {
  value: Language
  onChange: (language: Language) => void
  label: string
  variant?: keyof typeof variants
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Language)}
      aria-label={label}
      className={`rounded-md border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${variants[variant]}`}
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code} lang={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  )
}
