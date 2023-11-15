import * as React from 'react'
import TestSkeleton from '../../components/Skeleton'
import Close from '../Close'
import { Box, Container } from '@mui/material'
import TestsList from './TestsList'
import useSWR from 'swr'

const TestConnection = (props) => {
  const { data, error, isLoading } = useSWR(
    props.destId
      ? `/api/tests/connectiontest/${props.destTypeId}/${props.destId}?configuration=test`
      : null
  )
  if (error) {
    throw new Error(error)
  }
  if (isLoading) return <div>loading...</div>

  return (
    <Box sx={{ position: 'relative' }}>
      <div>
        <Close />
        <Container maxWidth="md">
          {isLoading ? (
            <TestSkeleton />
          ) : (
            <TestsList
              testResults={data?.testResults}
              destination={data?.jurisdictionDescription}
              destinationType={data?.destType}
              jurisdictionUrl={data?.destUrl}
            />
          )}
        </Container>
      </div>
    </Box>
  )
}

export default TestConnection
