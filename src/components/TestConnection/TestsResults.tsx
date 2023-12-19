import * as React from 'react'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import ErrorIcon from '@mui/icons-material/Error'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Box,
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
import { useState } from 'react'

interface testListProps {
  testResults: any[]
}

const TestsResults = ({ testResults }: testListProps) => {
  const [displayList, setDisplayList] = useState(true)
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
                    Test skipped due to connectivity test failures
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
  const handleExpand = () => {
    setDisplayList(!displayList)
  }
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
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="body1">
          {passeddata} out of {totaldata} Test Passed
        </Typography>
        {displayList ? (
          <Button
            id="less-details"
            color="primary"
            onClick={handleExpand}
            sx={{
              float: 'right',
            }}
          >
            Less Details
            <ExpandLessIcon />
          </Button>
        ) : (
          <Button
            id="more-details"
            color="primary"
            onClick={handleExpand}
            sx={{
              float: 'right',
            }}
          >
            More Details
            <ExpandMoreIcon />
          </Button>
        )}
      </Box>
      {displayList && list()}
    </>
  )
}

export default TestsResults
