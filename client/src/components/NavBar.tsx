import { Moon, Sun } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { useTheme } from '../hooks/use-theme'
import { authClient } from '../lib/auth-client'

export default function NavBar({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const navigate = useNavigate()
  const { isDark, toggle } = useTheme()

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => navigate('/login') },
    })
  }

  return (
    <nav className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
      <div className="flex items-center gap-6">
        <Link to="/" className="text-lg font-semibold text-foreground">
          Helpdesk
        </Link>
        <Link to="/tickets" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          Tickets
        </Link>
        {isAdmin && (
          <Link to="/users" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Users
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {isDark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
        </button>
        <span className="text-sm text-muted-foreground">{name}</span>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
