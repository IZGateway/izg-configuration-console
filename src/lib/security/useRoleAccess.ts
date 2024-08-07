import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import accessLevel from './accesslevel'

const useRoleAccess = () => {
  const session = useSession()
  const router = useRouter()

  if (session.status === 'loading' || session.status === 'unauthenticated')
    return {}

  const role = session.data && session.data.user.role
  const page = router.pathname.replace(/\[.*?\]/g, '').replaceAll('/', '')

  const accessLevels = accessLevel[role]?.[page]

  return accessLevels
}

export default useRoleAccess
