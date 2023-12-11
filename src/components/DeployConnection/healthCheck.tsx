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

const HealthCheck = (props) => {
  const [isRun, setIsRun] = useState(false)
  const [testResults, setTestResults] = React.useState(null)

  const handleButtonClick = async () => {
    try {
      const res = await fetch(
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

      if (!res.ok) {
        throw new Error('Network response was not ok')
      }

      const data = await res.json()
      setIsRun(false)
      setTestResults(data.testResults)
    } catch (error) {
      throw new Error(error)
    }
    setIsRun(true)
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

        {isRun ? (
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
