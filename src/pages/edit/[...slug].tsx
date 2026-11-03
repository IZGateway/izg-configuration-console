import * as React from 'react'
import { InferGetServerSidePropsType } from 'next'
import EditConnection from '../../components/EditConnection/index'
import Container from '../../components/Container'
import PageLoading from '../../components/Loader/PageLoading'
import { Box } from '@mui/material'
import ErrorBoundary from '../../components/ErrorBoundary'
import AccessDenied from '../../components/AccessDenied'
import { withPageAccess } from '../../lib/security/pageAccessGate'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

const Edit = ({
  accessDenied,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const router = useRouter()
  const { isReady, query } = router

  useEffect(() => {
    if (!isReady) return
  }, [isReady, query])

  if (accessDenied) return <AccessDenied title="Edit Connection" />

  return !isReady ? (
    <PageLoading />
  ) : (
    <Container title="Edit Connection">
      <ErrorBoundary>
        <Box sx={{ position: 'relative' }}>
          <div>
            <EditConnection
              destId={router?.query?.slug[1] as string}
              destTypeId={router?.query?.slug[0] as string}
            />
          </div>
        </Box>
      </ErrorBoundary>
    </Container>
  )
}

// Had no access check of any kind before this change — the page rendered for
// anyone who could sign in.
export const getServerSideProps = withPageAccess('edit')

export default Edit
