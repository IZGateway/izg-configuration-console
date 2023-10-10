import * as React from 'react'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import ErrorIcon from '@mui/icons-material/Error'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
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
  LinearProgress,
  List,
  ListItemIcon,
  ListItemText,
  ListItem,
  Chip,
} from '@mui/material'

interface testListProps {
  testResults: any[]
}

const TestsResults = ({ testResults }: testListProps) => {
  const handleReload = () => window.location.reload()
  const componentRef = useRef(null)
  const passeddata = testResults.filter((item) => item.status === 'PASS').length
  const totaldata = testResults.length
  const progressPct = Number(((passeddata / totaldata) * 100).toFixed())

  const list = () => (
    <List>
      {testResults.map((item) => (
        <React.Fragment key={item.name}>
          <ListItem id={item.name}>
            <ListItemIcon>
              {item.status === 'PASS' && <CheckCircleIcon color="primary" />}
              {item.status === 'FAIL' && <ErrorIcon color="secondary" />}
              {item.status === 'WARNING' && (
                <ReportProblemIcon color="warning" />
              )}
              {item.status === 'SKIPPED' && (
                <ErrorOutlineIcon sx={{ color: '#424242' }} />
              )}
            </ListItemIcon>

            {item.status === 'PASS' ? (
              <ListItemText primary={item.name} />
            ) : item.status === 'SKIPPED' ? (
              <ListItemText
                primary={item.name}
                secondary={
                  <Typography variant="body2" color="default">
                    Cannot test further on failure
                  </Typography>
                }
              />
            ) : (
              <ListItemText
                primary={item.name}
                secondary={
                  <Typography variant="body2" color="secondary">
                    {item.message}
                  </Typography>
                }
              />
            )}
            <Chip
              label={item.status === 'SKIPPED' ? 'N/A' : item.status}
              variant="outlined"
              color={
                item.status === 'PASS'
                  ? 'primary'
                  : item.status === 'SKIPPED'
                  ? 'default'
                  : 'secondary'
              }
              sx={{
                borderRadius: '4px',
                marginTop: '8px',
              }}
            />
          </ListItem>
          <Divider />
        </React.Fragment>
      ))}
    </List>
  )

  return (
    <>
      <Typography variant="body1">
        <Box component="span" fontWeight="fontWeightMedium" id="progress-bar">
          {progressPct}% Passed
        </Box>
      </Typography>
      <LinearProgress
        variant="determinate"
        value={progressPct}
        sx={{
          marginTop: 1,
          marginBottom: 1,
          height: 8,
          borderRadius: '8px',
        }}
      />
      <Typography variant="body1">
        {passeddata} out of {totaldata} Test Passed
      </Typography>
      {list()}
    </>
  )
}

export default TestsResults
