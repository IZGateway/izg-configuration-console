/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import ErrorIcon from '@mui/icons-material/Error'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  List,
  ListItemIcon,
  ListItemText,
  ListItem,
  Chip,
  Tooltip,
} from '@mui/material'
import { useState } from 'react'
import palette from '../../styles/theme/palette'

interface testListProps {
  testResults: any[]
}

const TestsResults = ({ testResults }: testListProps) => {
  const [displayList, setDisplayList] = useState(true)
  const passeddata = testResults.filter((item) => item.status === 'PASS').length
  const totaldata = testResults.length
  const progressPct = Number(((passeddata / totaldata) * 100).toFixed())

  const tooltipTexts = {
    dns: 'This test looks up the hostname in DNS to verify that it is known on the internet.',
    tcp: 'This test makes a connection to the host to verify that that it can be reached from the internet.',
    tls: 'This test ensures that the host uses Transport Layer Security version 1.2 or 1.3 when making secure connections.',
    cipher:
      'This test ensures that the host uses one of the NIST approved cipher suites, including TLS_AES_128_GCM_SHA256, TLS_AES_256_GCM_SHA384, ECDHE-ECDSA-AES128-GCM-SHA256, ECDHE-RSA-AES128-GCM-SHA256, ECDHE-ECDSA-AES256-GCM-SHA384, and ECDHE-RSA-AES256-GCM-SHA384.',
    wsdl: 'This test verifies that a service is running at the SOAP endpoint and returns the Web Services Description Language (WSDL) description of the service supports.  This test is a simple verification that something is listening.  It may fail if the jurisdiction decides NOT to support the WSDL download specified in SOAP.',
    connectivity:
      'The ConnectivityTest message in the CDC and IZ Gateway WSDLs is used to verify that the endpoint is up and running.',
    hl7: 'This SubmitSingleMessage test is used to verify that the specified username, password and facility id are valid and that an HL7 Version 2 message can be sent.  The query contains a well-known test patient for IZ Gateway testing.  If the endpoint responds with an HL7 message, then the new username and password are working.  If it responds with a security fault, then the username, password or facility id may need to be corrected.  The facility id used in this message should be a facility id only used for testing.',
  }

  const list = () => (
    <List>
      {testResults.map((item) => {
        const tooltipText = Object.keys(tooltipTexts).find((key) =>
          item.name.toLowerCase().includes(key.toLowerCase())
        )
          ? tooltipTexts[
              Object.keys(tooltipTexts).find((key) =>
                item.name.toLowerCase().includes(key.toLowerCase())
              )
            ]
          : 'No tooltip available'

        return (
          <React.Fragment key={item.name}>
            <ListItem
              id={item.name}
              sx={{ overflowWrap: 'anywhere!important' }}
            >
              <Box borderBottom="1px solid #ddd" width="100%" display="flex">
                <Box
                  display="flex"
                  alignContent={'center'}
                  flexDirection={{ xs: 'column', md: 'row' }}
                  width="100%"
                >
                  <Box
                    sx={{
                      padding: '4px',
                      paddingBottom: '8px',
                      width: '100%',
                      textAlign: 'start',
                      display: 'flex',
                      alignItems: { xs: 'flex-start', md: 'center' },
                      flexDirection: { xs: 'column', md: 'row' },
                    }}
                  >
                    {/* Mobile: Show check icon, info icon, and chip all on one line */}
                    <Box
                      sx={{
                        display: { xs: 'flex', md: 'none' },
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                        marginBottom: '8px',
                      }}
                    >
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        {/* Check/Error icon */}
                        {item.status === 'PASS' && (
                          <CheckCircleIcon color="primary" />
                        )}
                        {item.status === 'FAIL' && <ErrorIcon color="error" />}
                        {item.status === 'WARNING' && (
                          <ReportProblemIcon color="warning" />
                        )}
                        {item.status === 'SKIPPED' && (
                          <ErrorOutlineIcon sx={{ color: palette.error }} />
                        )}

                        {/* Info icon */}
                        <Tooltip
                          arrow
                          placement="bottom"
                          componentsProps={{
                            tooltip: {
                              sx: {
                                backgroundColor: palette.white,
                                boxShadow: '0px 3px 5px rgb(0 0 0 / 25%)',
                                border: `1px solid ${palette.border}`,
                                color: palette.black,
                                '& .MuiTooltip-arrow': {
                                  color: palette.border,
                                },
                              },
                            },
                          }}
                          title={
                            <Typography>
                              {tooltipText || 'No tooltip available'}
                            </Typography>
                          }
                        >
                          <InfoOutlinedIcon color="primary" />
                        </Tooltip>
                      </Box>

                      {/* Status chip */}
                      <Chip
                        label={item.status === 'SKIPPED' ? 'N/A' : item.status}
                        variant="outlined"
                        color={
                          item.status === 'PASS'
                            ? 'primary'
                            : item.status === 'SKIPPED'
                            ? 'default'
                            : 'error'
                        }
                        sx={{
                          borderRadius: '4px',
                        }}
                      />
                    </Box>

                    {/* Desktop: Original layout with icon on left */}
                    <ListItemIcon
                      sx={{
                        display: { xs: 'none', md: 'flex' },
                        minHeight: '56px',
                        float: 'inline-start',
                        alignItems: 'center',
                      }}
                    >
                      {item.status === 'PASS' && (
                        <CheckCircleIcon color="primary" />
                      )}
                      {item.status === 'FAIL' && <ErrorIcon color="error" />}
                      {item.status === 'WARNING' && (
                        <ReportProblemIcon color="warning" />
                      )}
                      {item.status === 'SKIPPED' && (
                        <ErrorOutlineIcon sx={{ color: palette.error }} />
                      )}
                    </ListItemIcon>
                    {item.status === 'PASS' ? (
                      <ListItemText primary={item.name} />
                    ) : item.status === 'SKIPPED' ? (
                      <ListItemText
                        primary={item.name}
                        secondary={
                          <Typography variant="body2" color="default">
                            {item.message}
                          </Typography>
                        }
                      />
                    ) : (
                      <ListItemText
                        primary={item.name}
                        secondary={
                          <>
                            <Typography
                              variant="body2"
                              color="error"
                              gutterBottom={true}
                            >
                              {item.message}
                            </Typography>
                            {item.detail && (
                              <Typography
                                variant="caption"
                                color="info"
                                component="textarea"
                                rows={10}
                                sx={{
                                  width: '100%',
                                }}
                                title="Drag bottom left corner to resize text area."
                              >
                                {item.detail}
                              </Typography>
                            )}
                          </>
                        }
                      />
                    )}
                  </Box>
                  <Box
                    display="flex"
                    alignItems="center"
                    flexDirection={{ xs: 'row', md: 'row' }}
                    sx={{ display: { xs: 'none', md: 'flex' } }}
                  >
                    <Box sx={{ padding: '4px', textAlign: 'end' }}>
                      <Tooltip
                        arrow
                        placement="bottom"
                        componentsProps={{
                          tooltip: {
                            sx: {
                              backgroundColor: palette.white,
                              boxShadow: '0px 3px 5px rgb(0 0 0 / 25%)',
                              border: `1px solid ${palette.border}`,
                              color: palette.black,
                              '& .MuiTooltip-arrow': {
                                color: palette.border,
                              },
                            },
                          },
                        }}
                        title={
                          <Typography>
                            {tooltipText || 'No tooltip available'}
                          </Typography>
                        }
                      >
                        <InfoOutlinedIcon
                          color="primary"
                          sx={{ marginRight: 2 }}
                        />
                      </Tooltip>
                    </Box>
                    <Box
                      padding="none"
                      sx={{ paddingBottom: '8px', textAlign: 'end' }}
                    >
                      <Chip
                        label={item.status === 'SKIPPED' ? 'N/A' : item.status}
                        variant="outlined"
                        color={
                          item.status === 'PASS'
                            ? 'primary'
                            : item.status === 'SKIPPED'
                            ? 'default'
                            : 'error'
                        }
                        sx={{
                          borderRadius: '4px',
                          marginTop: '8px',
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>
            </ListItem>
          </React.Fragment>
        )
      })}
    </List>
  )
  const handleExpand = () => {
    setDisplayList(!displayList)
  }
  const testTime = new Date().toLocaleTimeString()
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
          {passeddata} out of {totaldata} Test Passed at{' '}
          <span id="TestTime">{testTime}</span>
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
