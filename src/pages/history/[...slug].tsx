import * as React from 'react'
import { InferGetServerSidePropsType } from 'next'
import Container from '../../components/Container'
import PageLoading from '../../components/Loader/PageLoading'
import ConnectionHistory from '../../components/ConnectionHistory/index'
import { useRouter } from 'next/router'
import ErrorBoundary from '../../components/ErrorBoundary'
import AccessDenied from '../../components/AccessDenied'
import { withPageAccess } from '../../lib/security/pageAccessGate'
import { useEffect } from 'react'

const HistoryPage = ({
  accessDenied,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const router = useRouter()
  const { isReady, query } = router

  useEffect(() => {
    if (!isReady) return
  }, [isReady, query])

  if (accessDenied) return <AccessDenied title="Connection History" />

  return !isReady ? (
    <PageLoading />
  ) : (
    <Container title="Connection History">
      <ErrorBoundary>
        <ConnectionHistory
          destId={router?.query?.slug[1] as string}
          destTypeId={router?.query?.slug[0] as string}
          status={router.query?.status as string}
        />
      </ErrorBoundary>
    </Container>
  )
}

// Had no access check of any kind before this change — the page rendered for
// anyone who could sign in.
export const getServerSideProps = withPageAccess('history')

export default HistoryPage
