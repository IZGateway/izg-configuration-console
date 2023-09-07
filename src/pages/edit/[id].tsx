import * as React from 'react'
import EditConnection from '../../components/EditConnection/index'
import Container from '../../components/Container'
import { Box } from '@mui/material'
import ErrorBoundary from '../../components/ErrorBoundary'
import { useRouter } from 'next/router'

const Edit = () => {
  const router = useRouter()

  return (
    <Container title="Edit Connection">
      <ErrorBoundary>
        <Box sx={{ position: 'relative' }}>
          <div>
            <EditConnection
              destId={router.query?.id as string}
              destType={router.query?.destType as string}
            />
          </div>
        </Box>
      </ErrorBoundary>
    </Container>
  )
}

export default Edit
