import * as React from 'react'
import {
  Typography,
  CardHeader,
  Card,
  CardContent,
  Divider,
  Button,
  Tooltip,
  Chip,
  Box,
} from '@mui/material'
import { mutate } from 'swr'
import LaunchIcon from '@mui/icons-material/Launch'
import router from 'next/router'
import { useContext } from 'react'
import CombinedContext from '../../contexts/app'

const DeployConfirmation = (props) => {
  const { setAlert } = useContext(CombinedContext)
  const humanReadableScheduledTime = new Date(props.submittingValue.scheduledAt)

  const handleDeploy = async () => {
    const jurisdiction =
      props.submittingValue.destinations.jurisdiction.description
    const destType = props.submittingValue.destinations.destination_type.type
    const response = await fetch(
      `/api/deploy/destination/${props.destTypeId}/${props.destId}`,
      {
        method: 'POST',
        body: JSON.stringify(props.submittingValue),
      }
    )
    if (response.ok) {
      setAlert({
        level: 'success',
        jurisdiction: jurisdiction,
        dest_type: destType,
        message: `Connection ${jurisdiction} on environment ${destType} updated successfully!`,
      })
      // manually trigger revalidation to fetch the latest data from the server without refresh
      mutate(`/api/destinations/${props.destId}`)
      router.push('/manage')
    } else {
      setAlert({
        level: 'error',
        jurisdiction: jurisdiction,
        dest_type: destType,
        message: `Update on connection ${jurisdiction} on environment ${destType} was not successful. Please try again later!`,
      })
    }
  }

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
        <CardHeader title="Confirmation" />
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
      <CardContent>
        <Typography variant="body1" component="div">
          Please review the proposed edits to a user&apos;s connection.
          Determine whether the changes accurately reflect the connection
          details and adhere to our platform guidelines. Choose
          &apos;Deploy&apos; if the connection is ready.
        </Typography>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginRight: 2,
            marginTop: 4,
          }}
        >
          <Button
            id="deploy"
            color="primary"
            variant="outlined"
            data-testid="deployIcon"
            onClick={handleDeploy}
            sx={{
              borderRadius: '30px',
              padding: '8px 32px',
            }}
          >
            DEPLOY
            <LaunchIcon sx={{ marginLeft: 1 }} />
          </Button>
          <Typography variant="subtitle2" align="right">
            <strong>Scheduled On:</strong>
            <br />
            {humanReadableScheduledTime.toLocaleString()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

export default DeployConfirmation
