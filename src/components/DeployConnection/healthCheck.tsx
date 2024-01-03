import * as React from 'react'
import {
  Typography,
  CardHeader,
  Card,
  CardContent,
  Divider,
  Button,
} from '@mui/material'
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined'
import TestsResults from '../TestConnection/TestsResults'
import { useState } from 'react'
import TestSkeleton from '../Skeleton'

const HealthCheck = (props) => {
  const [testResults, setTestResults] = useState(null)
  const [isLoadingTest, setIsLoadingTest] = useState(false)

  const handleButtonClick = async () => {
    setIsLoadingTest(true)
    try {
      const response = await fetch(
        `/api/tests/connectiontest/${props.destTypeId}/${props.destId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            configuration: 'deploy',
          }),
        }
      )
      if (!response.ok) {
        setIsLoadingTest(false)
        const message = `An error has occured: ${response.status}`
        throw new Error(message)
      }
      const results = await response.json()
      setTestResults(results.testResults)
      setIsLoadingTest(false)
    } catch (error) {
      setIsLoadingTest(false)
      throw new Error(error)
    }
  }

  return (
    <Card sx={{ borderRadius: '0px 0px 16px 16px' }} id="health-check">
      <CardHeader title="Run health check requested configuration edits" />

      <Divider />
      <CardContent>
        <Typography variant="body1" component="div">
          This step is not mandatory but highly suggest running it before an
          approval of a change request. This test is using the new credentials
        </Typography>

        {isLoadingTest && <TestSkeleton />}
        {testResults ? (
          <TestsResults testResults={testResults} />
        ) : (
          <Button
            id="run"
            color="primary"
            variant="outlined"
            data-testid="runIcon"
            onClick={handleButtonClick}
            sx={{
              borderRadius: '30px',
              marginTop: 4,
              padding: '8px 32px',
            }}
          >
            RUN
            <MonitorHeartOutlinedIcon sx={{ marginLeft: 1 }} />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default HealthCheck
