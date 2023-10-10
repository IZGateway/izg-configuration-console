import * as React from 'react'
import Close from '../Close'
import { Box, Typography } from '@mui/material'
import useSWR from 'swr'
import HealthCheck from './healthCheck'
import ChangeRequestTicket from './changeRequestTicket'
import DeployConfirmation from './deployConfirmation'
import DetailsChangeRequest from './detailsChangeRequest'

const DeployConnection = (props) => {
  const { data, error, isLoading } = useSWR(
    `/api/changerequest/${props.destTypeId}/${props.destId}`
  )

  if (error) return <div>failed to load</div>
  if (isLoading) return <div>loading...</div>

  return (
    <>
      <Close />
      <Box sx={{ marginTop: 4 }}>
        <Typography
          variant="h1"
          fontWeight={700}
          fontSize="32px"
          id="title-change-request"
        >
          View Change Request for $UPDATE THIS
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 4 }}>
        <Box sx={{ width: '50%' }}>
          <HealthCheck destId={props.destId} destTypeId={props.destTypeId} />
          <ChangeRequestTicket {...data} />
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <DetailsChangeRequest
            destId={props.destId}
            destTypeId={props.destTypeId}
            submittingValue={data}
          />
          <DeployConfirmation
            destId={props.destId}
            destTypeId={props.destTypeId}
          />
        </Box>
      </Box>
    </>
  )
}

export default DeployConnection
