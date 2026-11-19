import { useEffect, useSyncExternalStore } from 'react'
import { LANGUAGES, translations, type Language } from './translations'

const isLanguage = (value: string | null): value is Language => LANGUAGES.some((l) => l.code === value)

function readSavedLanguage(): Language {
  try {
    const saved = localStorage.getItem('language')
    if (isLanguage(saved)) return saved
  } catch {
    // Storage can be blocked (private mode); fall back to English
  }
  return 'en'
}

// One shared value for every component that calls useLanguage(), so the switcher in the
// header updates the page below it without a provider
let current: Language = readSavedLanguage()
const listeners = new Set<() => void>()

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const getSnapshot = () => current

function setLanguage(next: Language) {
  if (next === current) return
  current = next
  try {
    localStorage.setItem('language', next)
  } catch {
    // The choice still applies for this visit
  }
  listeners.forEach((listener) => listener())
}

export function useLanguage() {
  const language = useSyncExternalStore(subscribe, getSnapshot)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return { language, setLanguage, t: translations[language] }
}
