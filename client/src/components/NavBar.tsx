import { Link, useNavigate } from 'react-router'
import { authClient } from '../lib/auth-client'

export default function NavBar({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => navigate('/login') },
    })
  }

  return (
    <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center gap-6">
        <Link to="/" className="text-lg font-semibold text-gray-900">
          Helpdesk
        </Link>
        {isAdmin && (
          <Link to="/users" className="text-sm font-medium text-gray-700 hover:text-gray-900">
            Users
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-700">{name}</span>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
