import * as React from 'react'
import DeployConnection from '../../components/DeployConnection/index'
import Container from '../../components/Container'
import { Box } from '@mui/material'
import ErrorBoundary from '../../components/ErrorBoundary'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

const Deploy = (props) => {
  const router = useRouter()
  const { isReady, query } = router

  useEffect(() => {
    if (!isReady) return
  }, [isReady, query])

  return !isReady ? (
    <>Loading....</>
  ) : (
    <Container title="Deploy Connection">
      <ErrorBoundary>
        <Box sx={{ position: 'relative' }}>
          <div>
            <DeployConnection
              destId={router?.query?.slug[1] as string}
              destTypeId={router?.query?.slug[0] as string}
            />
          </div>
        </Box>
      </ErrorBoundary>
    </Container>
  )
}

export default Deploy
