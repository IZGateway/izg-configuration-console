import * as React from 'react'
import EditConnection from '../../components/EditConnection/index'
import Container from '../../components/Container'
import { Box } from '@mui/material'
import ErrorBoundary from '../../components/ErrorBoundary'
import Close from '../../components/Close'
import { useRouter } from 'next/router'

const Edit = () => {
  const router = useRouter()

  return (
    <Container title="Edit Connection">
      <ErrorBoundary>
        <Box sx={{ position: 'relative' }}>
          <div>
            <Close />
            <EditConnection destId={router.query?.id as string} />
          </div>
        </Box>
      </ErrorBoundary>
    </Container>
  )
}

export default Edit
