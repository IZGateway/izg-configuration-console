import * as React from 'react'
import {
  Typography,
  CardHeader,
  Card,
  CardContent,
  Divider,
  Button,
  Chip,
  Tooltip,
  Box,
} from '@mui/material'
import Link from 'next/link'
import useRoleAccess from '../../lib/security/useRoleAccess'
import { ChangeRequestPageAccessControl } from '../../lib/type/PageAccessControls'

interface ViewChangeRequestTicketProps {
  changeScheduledAt: Date
  jiraUrl: string
  jiraId: string
  status: string
}

const ViewChangeRequestTicket = (props: ViewChangeRequestTicketProps) => {
  const accessLevels: ChangeRequestPageAccessControl = useRoleAccess()
  const humanReadableScheduledTime = new Date(props.changeScheduledAt)
  const { jiraUrl } = props
  return (
    <Card
      sx={{ marginTop: 4, borderRadius: '0px 0px 16px 16px' }}
      id="change-request"
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginRight: 4,
        }}
      >
        <CardHeader title="Change Request Status" />
        <Tooltip
          title={
            <div>
              To be deployed on <br />
              {humanReadableScheduledTime.toLocaleString()}
            </div>
          }
          placement="bottom"
        >
          <Chip
            label={props.status}
            variant="filled"
            color="secondary"
            sx={{
              borderRadius: '4px',
            }}
          />
        </Tooltip>
      </Box>
      <Divider />
      {accessLevels.canViewJiraTicket && (
        <CardContent>
          <Typography variant="body1" component="div">
            To update the status of this change request, please click on the
            link below.
          </Typography>
          <Link href={jiraUrl + props.jiraId} target="_blank">
            <Button
              id="run"
              color="primary"
              data-testid="CRTicket"
              sx={{
                marginTop: 4,
              }}
            >
              Access Change Request Ticket
            </Button>
          </Link>
        </CardContent>
      )}
    </Card>
  )
}

export default ViewChangeRequestTicket
