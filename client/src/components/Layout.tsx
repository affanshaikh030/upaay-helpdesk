import { Navigate, Outlet } from 'react-router'
import { authClient } from '../lib/auth-client'
import NavBar from './NavBar'

export default function Layout() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) return null
  if (!session) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar name={session.user.name} />
      <Outlet />
    </div>
  )
}
