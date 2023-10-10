import * as React from 'react'
import {
  Typography,
  CardHeader,
  Card,
  CardContent,
  Divider,
  Button,
} from '@mui/material'
import Link from 'next/link'

const ChangeRequestTicket = (props: any) => {
  return (
    <Card
      sx={{ marginTop: 4, borderRadius: '0px 0px 16px 16px' }}
      id="change-request"
    >
      <CardHeader title="View JIRA Ticket" />

      <Divider />
      <CardContent>
        <Typography variant="subtitle1" component="div">
          To update the status of this change request, please click on the link
          below. Something how Jira is the source of truth and you may need to
          login additional systems.
        </Typography>
      </CardContent>
      <Link
        href={'https://support.izgateway.org/browse/' + props.jira_id}
        target="_blank"
      >
        <Button id="run" color="primary" data-testid="CRTicket">
          Access Change Request Ticket
        </Button>
      </Link>
    </Card>
  )
}

export default ChangeRequestTicket
