import { Role } from '@helpdesk/core'
import { authClient } from '../lib/auth-client'

// For showing admin-only controls. The server still enforces the role on every admin endpoint
export function useIsAdmin() {
  const { data: session } = authClient.useSession()
  return session?.user.role === Role.ADMIN
}
