import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'

const AdminGuard = (Component: any) => {
  return function IsAdminUser(props: any) {
    const router = useRouter()
    const { data: session, status } = useSession()
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
      if (status === 'authenticated') {
        if (session?.user.isAdmin) {
          setIsLoading(false)
        } else {
          router.push('/manage')
        }
      }
    }, [router, session, status])

    if (isLoading) {
      return <div>Loading...</div>
    }
    return <Component {...props} />
  }
}

export default AdminGuard
