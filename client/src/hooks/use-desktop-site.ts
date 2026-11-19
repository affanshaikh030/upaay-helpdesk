import { useState } from 'react'

const DESKTOP = 'width=1280'
const MOBILE = 'width=device-width, initial-scale=1'

const viewportMeta = () => document.querySelector('meta[name="viewport"]')

// The inline script in index.html applies the saved choice before first paint,
// so the viewport tag is the source of truth here
export function useDesktopSite() {
  const [isDesktop, setIsDesktop] = useState(() => viewportMeta()?.getAttribute('content') === DESKTOP)

  const toggle = () => {
    const next = !isDesktop
    viewportMeta()?.setAttribute('content', next ? DESKTOP : MOBILE)
    try {
      localStorage.setItem('viewport', next ? 'desktop' : 'mobile')
    } catch {
      // Storage can be blocked (private mode); the toggle still works for this visit
    }
    setIsDesktop(next)
  }

  return { isDesktop, toggle }
}
