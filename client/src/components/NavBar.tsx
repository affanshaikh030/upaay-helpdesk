import { Monitor, Moon, Smartphone, Sun } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { useDesktopSite } from '../hooks/use-desktop-site'
import { useTheme } from '../hooks/use-theme'
import { useLanguage } from '../i18n/use-language'
import { authClient } from '../lib/auth-client'
import { BRAND_NAME } from '../lib/brand'
import { LanguageSwitcher } from './LanguageSwitcher'

export default function NavBar({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const navigate = useNavigate()
  const { isDark, toggle } = useTheme()
  const { isDesktop, toggle: toggleDesktop } = useDesktopSite()
  const { language, setLanguage, t } = useLanguage()

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => navigate('/login') },
    })
  }

  return (
    <nav className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-card px-4 py-3 sm:px-6">
      <div className="flex items-center gap-4 sm:gap-6">
        <Link to="/" className="text-lg font-semibold text-foreground">
          {BRAND_NAME}
        </Link>
        <Link to="/tickets" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          {t.navTickets}
        </Link>
        {isAdmin && (
          <Link to="/users" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            {t.navUsers}
          </Link>
        )}
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggle}
            aria-label={isDark ? t.switchToLightMode : t.switchToDarkMode}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {isDark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={toggleDesktop}
            aria-label={isDesktop ? t.switchToMobileSite : t.switchToDesktopSite}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {isDesktop ? (
              <Smartphone className="size-4" aria-hidden="true" />
            ) : (
              <Monitor className="size-4" aria-hidden="true" />
            )}
          </button>
          <LanguageSwitcher variant="theme" value={language} onChange={setLanguage} label={t.language} />
        </div>
        <span className="text-sm text-muted-foreground">{name}</span>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
        >
          {t.signOut}
        </button>
      </div>
    </nav>
  )
}
