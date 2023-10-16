import * as React from 'react'
import {
  Typography,
  CardHeader,
  Card,
  CardContent,
  Divider,
  Button,
} from '@mui/material'
import useSWR, { mutate } from 'swr'
import Link from 'next/link'
import LaunchIcon from '@mui/icons-material/Launch'
import router from 'next/router'

const JIRA_BROWSE_URL = process.env.JIRA_BROWSE_URL || undefined

const DeployConfirmation = (props) => {
  const handleDeploy = async () => {
    const response = await fetch(
      `/api/update/destination/${props.destTypeId}/${props.destId}`,
      {
        method: 'POST',
        body: JSON.stringify(props.submittingValue), ///ADD PASSWORD HERE
      }
    )
    if (response.ok) {
      // manually trigger revalidation to fetch the latest data from the server without refresh
      mutate(`/api/destinations/${props.destId}`)
      router.push('/manage')
    } else {
      throw new Error('Update was not successful. Please try again later')
    }
  }

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
          onClick={handleDeploy}
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

export default DeployConfirmation
