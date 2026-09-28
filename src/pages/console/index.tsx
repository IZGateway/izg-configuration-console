import { InferGetServerSidePropsType } from 'next'
import Container from '../../components/Container'
import Console from '../../components/Console/index'
import { useRouter } from 'next/router'
import ErrorBoundary from '../../components/ErrorBoundary'
import AccessDenied from '../../components/AccessDenied'
import { withPageAccess } from '../../lib/security/pageAccessGate'

const ConsolePage = ({
  accessDenied,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const router = useRouter()
  const { isReady } = router

  // Checked before the router-ready branch: a denied user must see the denial,
  // not a permanent "Loading...." while the router settles.
  if (accessDenied) return <AccessDenied title="Console" />

  return !isReady ? (
    <>Loading....</>
  ) : (
    <Container title="Console">
      <ErrorBoundary>
        <Console />
      </ErrorBoundary>
    </Container>
  )
}

// Had no access check of any kind before IGDD-3472. canViewConsole gates the
// admin log search only — the landing page's status-report widget is a
// separate surface and is not affected.
export const getServerSideProps = withPageAccess('console')

export default ConsolePage
