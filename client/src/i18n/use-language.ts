import { useEffect, useState } from 'react'
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

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>(readSavedLanguage)

  // Only the login page is translated, so put <html lang> back to English when leaving it
  useEffect(() => {
    document.documentElement.lang = language
    return () => {
      document.documentElement.lang = 'en'
    }
  }, [language])

  const setLanguage = (next: Language) => {
    setLanguageState(next)
    try {
      localStorage.setItem('language', next)
    } catch {
      // The choice still applies for this visit
    }
  }

  return { language, setLanguage, t: translations[language] }
}
