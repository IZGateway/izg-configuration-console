import * as React from 'react'
import Close from '../Close'
import { Box, Container } from '@mui/material'
import TestsList from './TestsList'

const TestConnection = (props) => {
  return (
    <Box sx={{ position: 'relative' }}>
      <div>
        <Close />
        <Container maxWidth="md">
          <TestsList
            numberOfTests={props.numberOfTests}
            testResults={props.connectionTestResult?.testResults}
            destination={props.connectionTestResult?.jurisdictionDescription}
            destinationType={props.connectionTestResult?.destType}
            jurisdictionUrl={props.connectionTestResult?.destUrl}
          />
        </Container>
      </div>
    </Box>
  )
}

export default TestConnection
