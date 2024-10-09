import * as React from 'react'
import { Box, Typography } from '@mui/material'
import useSWR from 'swr'
import HealthCheck from './healthCheck'
import ViewChangeRequestTicket from './viewChangeRequestTicket'
import DeployConfirmation from './deployConfirmation'
import DetailsChangeRequest from './detailsChangeRequest'
import MakeChanges from './makeChanges'
import { ChangeRequestPageAccessControl } from '../../lib/type/PageAccessControls'
import useRoleAccess from '../../lib/security/useRoleAccess'

const JIRA_STATUS_FOR_DEPLOY = 'Approved'

const DeployConnection = (props) => {
  const { changerequestData } = props
  const accessLevels: ChangeRequestPageAccessControl = useRoleAccess()
  const humanReadableScheduledTime = new Date(changerequestData.scheduledAt)
  const {
    data: changerequestStatusData,
    error: changerequestStatusError,
    isLoading: changerequestStatusLoading,
  } = useSWR(
    changerequestData
      ? `/api/changerequeststatus/${changerequestData.jira_id}`
      : null
  )

  if (changerequestStatusError)
    throw new Error(changerequestStatusError.message)
  if (changerequestStatusLoading) return <div>loading...</div>

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
          {changerequestData.destinations.jurisdiction.description}{' '}
          {changerequestData.destinations.destination_type.type} changes
          requested for {humanReadableScheduledTime.toLocaleString()}
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
          {accessLevels.canRunHealthCheck && (
            <HealthCheck destId={props.destId} destTypeId={props.destTypeId} />
          )}
          {accessLevels.canDeployChange &&
            status === JIRA_STATUS_FOR_DEPLOY && (
              <DeployConfirmation
                destId={props.destId}
                destTypeId={props.destTypeId}
                submittingValue={changerequestData}
                status={status}
              />
            )}
          {/* {accessLevels.canViewJiraTicket && ( */}
          <ViewChangeRequestTicket
            {...changerequestData}
            status={status}
            jiraUrl={props.jiraUrl}
          />
          {/* )} */}

          {status !== JIRA_STATUS_FOR_DEPLOY &&
            accessLevels.canRescheduleRequest && (
              <MakeChanges
                destId={props.destId}
                destTypeId={props.destTypeId}
              />
            )}
        </Box>
        <Box sx={{ width: '66%' }}>
          {accessLevels.canViewDetails && (
            <DetailsChangeRequest
              destId={props.destId}
              destTypeId={props.destTypeId}
              submittingValue={changerequestData}
            />
          )}
        </Box>
      </Box>
    </>
  )
}

export default DeployConnection
