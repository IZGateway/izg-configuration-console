import * as React from 'react'
import ReactToPrint from 'react-to-print'
import PrintIcon from '@mui/icons-material/Print'
import { useRef } from 'react'
import {
  Card,
  CardHeader,
  CardContent,
  Container,
  Box,
  ButtonGroup,
  Typography,
  Divider,
  Button,
} from '@mui/material'
import TestsResults from './TestsResults'

interface testListProps {
  testResults: any[]
  destination: string
  destinationType: string
  jurisdictionUrl: string
  numberOfTests: number
}

const TestsList = ({
  testResults,
  destination,
  destinationType,
  jurisdictionUrl,
  numberOfTests,
}: testListProps) => {
  const handleReload = () => window.location.reload()
  const componentRef = useRef(null)

  const buttonGroup = () => (
    <Container
      maxWidth="sm"
      sx={{
        marginTop: 4,
      }}
    >
      <ButtonGroup
        variant="contained"
        fullWidth
        size="large"
        sx={{
          alignItems: 'center',
          borderRadius: '30px',
        }}
      >
        <Button
          id="rerun"
          color="primary"
          variant="outlined"
          onClick={handleReload}
          data-testid="RerunIcon"
          sx={{
            borderRadius: '30px',
          }}
        >
          RERUN TEST
        </Button>
        <ReactToPrint
          trigger={() => (
            <Button
              id="print"
              variant="contained"
              color="primary"
              endIcon={<PrintIcon />}
              sx={{
                borderRadius: '30px',
              }}
            >
              PRINT
            </Button>
          )}
          content={() => componentRef.current}
        />
      </ButtonGroup>
    </Container>
  )

  return (
    <Box sx={{ position: 'relative' }}>
      <div>
        <Container ref={componentRef}>
          <Box sx={{ marginTop: 4 }}>
            <Typography
              gutterBottom
              align="center"
              variant="h1"
              fontWeight={700}
              fontSize="32px"
              id="test-connection"
            >
              Connection testing for{' '}
              {destination === 'unknown' ? '' : destination} {destinationType}
            </Typography>
            <Typography align="center" variant="body1">
              Test results for the URL <strong>{jurisdictionUrl}</strong> are
              displayed below. For any tests that fail, please make required
              changes to the connection and then retry testing.
            </Typography>
          </Box>
          <Card
            sx={{ marginTop: 4, borderRadius: '0px 0px 16px 16px' }}
            id="test-connection-info"
          >
            <CardHeader title="Test your connection" />
            <Divider />
            <CardContent>
              <TestsResults testResults={testResults} />
            </CardContent>
          </Card>
        </Container>
        {buttonGroup()}
      </div>
    </Box>
  )
}

export default TestsList
