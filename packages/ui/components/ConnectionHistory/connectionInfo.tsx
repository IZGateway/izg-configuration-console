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

interface InfoProps {
  destinationById: {
    dest_uri: string
    dest_type: {
      type: string
    }
    jurisdiction: {
      description: string
    }
    status: {
      status: string
    }
    username: string
    facility_id: string
    MSH3: string
    MSH4: string
    MSH5: string
    MSH6: string
    MSH22: string
    RXA11: string
  }
}

const ConnectionInfo = ({ destinationById }: InfoProps) => {
  const [open, setOpen] = React.useState(false)

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
            data={destinationById}
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
                  {destinationById.dest_type.type}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle1" component="div">
                  ENDPOINT URL
                </Typography>
                <Typography>
                  <Link
                    href={destinationById.dest_uri.toString()}
                    target="_blank"
                    style={{ color: '#015A2F', overflowWrap: 'anywhere' }}
                  >
                    {destinationById.dest_uri.toString()}
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
                  {destinationById.jurisdiction === null
                    ? 'N/A'
                    : destinationById.jurisdiction.description}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle1" component="div">
                  STATUS
                </Typography>
                <Status status={destinationById.status} color={false} />
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </div>
  )
}

export default ConnectionInfo
