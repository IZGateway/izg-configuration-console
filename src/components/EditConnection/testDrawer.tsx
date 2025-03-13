/* eslint-disable @typescript-eslint/no-explicit-any */
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
  onClose: (isOpen: boolean) => void
  isLoading: boolean
  testResults: any
}

const TestDrawer = ({
  open,
  onClose,
  isLoading,
  testResults,
}: TestDrawerProps) => {
  return (
    <Drawer anchor={'right'} open={open} onClose={onClose}>
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
            Health check results are displayed below. For any tests that fail,
            please make required changes to the connection and then retry health
            check.
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
            id="close"
            data-testid="close"
            color="primary"
            variant="outlined"
            fullWidth
            onClick={() => onClose(open)}
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
