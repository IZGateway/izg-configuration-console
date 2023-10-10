import * as React from 'react'
import {
  IconButton,
  Box,
  Typography,
  CardHeader,
  Card,
  CardContent,
  Divider,
  Tooltip,
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import Link from 'next/link'
import Status from '../Status'
import ConnectionInfoDetail from './connectionInfoDetail'
import useSWR from 'swr'

const ConnectionInfo = (props) => {
  const [open, setOpen] = React.useState(false)
  const {
    data: destData,
    error: destError,
    isLoading: isDestLoading,
  } = useSWR(`/api/destinations/${props.destTypeId}/${props.destId}`)
  if (destError) return <div>failed to load</div>
  if (isDestLoading) return <div>loading...</div>
  if (!destData) return <div>no destination data found</div>

  const toggleDrawer = () => {
    setOpen(!open)
  }
  return (
    <div>
      <Card
        sx={{ marginTop: 4, borderRadius: '0px 0px 16px 16px' }}
        id="connection-info"
      >
        <CardHeader
          title="Connection Info"
          action={
            <Tooltip
              placement="top"
              arrow
              title="View all connection information"
            >
              <IconButton color="primary" onClick={toggleDrawer} id="detail">
                <VisibilityIcon
                  sx={{
                    display: 'flex',
                  }}
                />
              </IconButton>
            </Tooltip>
          }
        />
        {open && (
          <ConnectionInfoDetail
            destination={destData}
            open={open}
            display={toggleDrawer}
          />
        )}
        <Divider />
        <CardContent>
          <Box sx={{ display: 'flex', gap: '2rem' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <Box>
                <Typography variant="subtitle1" component="div">
                  ENVIRONMENT
                </Typography>
                <Typography gutterBottom variant="body1">
                  {props.destType}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle1" component="div">
                  ENDPOINT URL
                </Typography>
                <Typography>
                  <Link
                    href={destData?.dest_uri.toString()}
                    target="_blank"
                    style={{ color: '#015A2F', overflowWrap: 'anywhere' }}
                  >
                    {destData?.dest_uri.toString()}
                  </Link>
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <Box>
                <Typography variant="subtitle1" component="div">
                  JURISDICTION
                </Typography>
                <Typography gutterBottom variant="body1">
                  {destData ? destData.jurisdiction.description : 'N/A'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle1" component="div">
                  STATUS
                </Typography>
                <Status
                  isConnected={props.status?.toLowerCase() === 'connected'}
                  color={false}
                />
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </div>
  )
}

export default ConnectionInfo
