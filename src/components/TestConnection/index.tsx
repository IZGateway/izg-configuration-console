import * as React from 'react'
import TestSkeleton from '../../components/Skeleton'
import Close from '../Close'
import { Box, Container } from '@mui/material'
import TestsList from './TestsList'

const TestConnection = (props) => {
  const [isLoading, setIsLoading] = React.useState(true)
  const [testResults, setTestResults] = React.useState(null)
  let data
  React.useEffect(() => {
    const fetchTestResults = async () => {
      try {
        const res = await fetch(
          `/api/tests/connectiontest/${props.destTypeId}/${props.destId}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              configuration: 'test',
            }),
          }
        )

        if (!res.ok) {
          throw new Error('Network response was not ok')
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
        data = await res.json()
        setIsLoading(false)
        setTestResults(data.testResults)
      } catch (error) {
        throw new Error(error)
      }
    }

    fetchTestResults()
  }, []) //Run only once

  return (
    <Box sx={{ position: 'relative' }}>
      <div>
        <Close />
        <Container maxWidth="md">
          {isLoading ? (
            <TestSkeleton />
          ) : (
            <TestsList
              testResults={testResults}
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
