import { LANGUAGES, type Language } from '@/i18n/translations'

export function LanguageSwitcher({
  value,
  onChange,
  label,
}: {
  value: Language
  onChange: (language: Language) => void
  label: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Language)}
      aria-label={label}
      className="rounded-md border border-white/20 bg-neutral-900 px-2 py-1.5 text-sm text-white [color-scheme:dark] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code} lang={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  )
}
