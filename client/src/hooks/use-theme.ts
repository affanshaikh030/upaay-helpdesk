import { useState } from 'react'

// The inline script in index.html applies the saved theme (dark by default) before first paint,
// so the class on <html> is the source of truth here
export function useTheme() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  const toggle = () => {
    const next = !isDark
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      // Storage can be blocked (private mode); the toggle still works for this visit
    }
    setIsDark(next)
  }

  return { isDark, toggle }
}
