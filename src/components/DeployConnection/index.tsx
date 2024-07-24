import * as React from 'react'
import { Box, Typography } from '@mui/material'
import useSWR from 'swr'
import HealthCheck from './healthCheck'
import ViewChangeRequestTicket from './viewChangeRequestTicket'
import DeployConfirmation from './deployConfirmation'
import DetailsChangeRequest from './detailsChangeRequest'
import MakeChanges from './makeChanges'
import { useSession } from 'next-auth/react'

const JIRA_STATUS_FOR_DEPLOY = 'Approved'

const DeployConnection = (props) => {
  const { data: session } = useSession()
  const {
    data: changerequestData,
    error: changerequestError,
    isLoading: changerequestLoading,
  } = useSWR(`/api/changerequest/${props.destTypeId}/${props.destId}`)

  const {
    data: changerequestStatusData,
    error: changerequestStatusError,
    isLoading: changerequestStatusLoading,
  } = useSWR(
    changerequestData
      ? `/api/changerequeststatus/${changerequestData.jira_id}`
      : null
  )

  if (changerequestError || changerequestStatusError)
    throw new Error(
      changerequestError.message || changerequestStatusError.message
    )
  if (changerequestLoading || changerequestStatusLoading)
    return <div>loading...</div>

  const status = changerequestStatusData.fields.status.name

  return (
    <>
      <Box sx={{ marginTop: 4 }}>
        <Typography
          variant="h1"
          fontWeight={700}
          fontSize="32px"
          id="title-change-request"
        >
          View Change Request for{' '}
          {changerequestData.destinations.jurisdiction.description}{' '}
          {changerequestData.destinations.destination_type.type}
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          gap: 4,
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginTop: 4,
        }}
      >
        <Box sx={{ width: '33%' }}>
          <HealthCheck destId={props.destId} destTypeId={props.destTypeId} />
          {status === JIRA_STATUS_FOR_DEPLOY ? (
            <DeployConfirmation
              destId={props.destId}
              destTypeId={props.destTypeId}
              submittingValue={changerequestData}
              status={status}
            />
          ) : (
            <>
              {session?.user.isAdmin && (
                <ViewChangeRequestTicket
                  {...changerequestData}
                  status={status}
                  jiraUrl={props.jiraUrl}
                />
              )}
              <MakeChanges
                destId={props.destId}
                destTypeId={props.destTypeId}
              />
            </>
          )}
        </Box>
        <Box sx={{ width: '66%' }}>
          <DetailsChangeRequest
            destId={props.destId}
            destTypeId={props.destTypeId}
            submittingValue={changerequestData}
          />
        </Box>
      </Box>
    </>
  )
}

export default DeployConnection
