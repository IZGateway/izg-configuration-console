import * as React from 'react'
import {
  Typography,
  CardHeader,
  Card,
  CardContent,
  Divider,
  Button,
} from '@mui/material'
import useSWR from 'swr'
import Link from 'next/link'
import LaunchIcon from '@mui/icons-material/Launch'

const JIRA_BROWSE_URL = process.env.JIRA_BROWSE_URL || undefined

const deployConfirmation = (params: { destTypeId: any; destId: any }) => {
  return (
    <Card
      sx={{ marginTop: 4, borderRadius: '0px 0px 16px 16px' }}
      id="change-request"
    >
      <CardHeader title="Confirmation" />

      <Divider />
      <CardContent>
        <Typography variant="subtitle1" component="div">
          Please review the proposed edits to a user`s connection. Determine
          whether the changes accurately reflect the connection details and
          adhere to our platform guidelines. Choose `Deploy` if the connection
          is ready.
        </Typography>

        <Button
          id="deploy"
          color="primary"
          variant="outlined"
          data-testid="deployIcon"
          sx={{
            borderRadius: '30px',
          }}
        >
          DEPLOY
          <LaunchIcon sx={{ marginLeft: 1 }} />
        </Button>
      </CardContent>
    </Card>
  )
}

export default deployConfirmation
