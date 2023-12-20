import * as React from 'react'
import {
  Card,
  CardContent,
  Divider,
  Typography,
  Container,
  Drawer,
  Box,
  Button,
} from '@mui/material'
import TestsResults from '../TestConnection/TestsResults'
import TestSkeleton from '../Skeleton'

interface TestDrawerProps {
  open: boolean
  display: (isOpen: boolean) => void
  values?: any
}

const TestDrawer = ({ open, display, values }: TestDrawerProps) => {
  const [testResults, setTestResults] = React.useState(null)
  const [isLoading, setIsLoading] = React.useState(true)
  React.useEffect(() => {
    const fetchTestResults = async () => {
      try {
        const res = await fetch(
          `/api/tests/connectiontest/${values.destination_type.type_id}/${values.dest_id}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values,
            }),
          }
        )

        if (!res.ok) {
          throw new Error('Network response was not ok')
        }

        const data = await res.json()
        setIsLoading(false)
        setTestResults(data.testResults)
      } catch (error) {
        throw new Error(error)
      }
    }

    fetchTestResults()
  }, []) //Run only once

  return (
    <Drawer anchor={'right'} open={open} onClose={display}>
      <Container maxWidth="xs">
        <Box sx={{ marginTop: 2 }}>
          <Typography
            gutterBottom
            variant="h5"
            fontWeight={700}
            id="test-connection"
          >
            Run health check with the new edits
          </Typography>
          <Divider />
          <Typography sx={{ marginTop: 2, marginBottom: 2 }} variant="body1">
            Some text needed for this section
          </Typography>
        </Box>
        <Card
          sx={{ borderRadius: '0px 0px 16px 16px' }}
          id="test-connection-info"
        >
          <CardContent>
            {isLoading ? (
              <TestSkeleton />
            ) : (
              <TestsResults testResults={testResults} />
            )}
          </CardContent>
        </Card>
        <Box pt={4} textAlign="center">
          <Button
            id="closeDetail"
            color="primary"
            variant="outlined"
            fullWidth
            onClick={() => display(open)}
            sx={{
              borderRadius: '30px',
            }}
          >
            CLOSE
          </Button>
        </Box>
      </Container>
    </Drawer>
  )
}

export default TestDrawer
