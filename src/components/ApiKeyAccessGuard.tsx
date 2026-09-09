import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import useRoleAccess from '../lib/security/useRoleAccess'
import { ApiKeyManagementPageAccessControl } from '../lib/type/PageAccessControls'

// Page-level counterpart to AdminGuard: roles without `canListApiKeys` (e.g.
// IZG Program, CDC Program, CDC CISO — not present in the access matrix at
// all) previously saw the full API Key Management screen render regardless,
// since ApiKeyManagement's own useRoleAccess() usage only hides individual
// action buttons, not the page itself (IGDD-3339). Mirrors the same
// accessLevels object the page already computes, so this can never drift
// from what gates Create/Revoke/Renew/Cancel there.
const ApiKeyAccessGuard = (Component: any) => {
  return function HasApiKeyListAccess(props: any) {
    const router = useRouter()
    const { status } = useSession()
    const accessLevels = useRoleAccess() as
      | ApiKeyManagementPageAccessControl
      | undefined
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
      if (status === 'authenticated') {
        if (accessLevels?.canListApiKeys) {
          setIsLoading(false)
        } else {
          router.push('/manageconnections')
        }
      }
    }, [router, status, accessLevels])

    if (isLoading) {
      return <div>Loading...</div>
    }
    return <Component {...props} />
  }
}

export default ApiKeyAccessGuard
