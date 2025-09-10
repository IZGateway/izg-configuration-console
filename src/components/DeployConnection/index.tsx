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
import { DestinationChangeRequest } from '../../lib/type/DestinationChangeRequest'

const JIRA_STATUS_FOR_DEPLOY = 'Approved'

interface DeployConnectionProps {
  changeRequest: DestinationChangeRequest
  jiraUrl: string
}

interface ChangeRequestStatusData {
  fields: {
    status: {
      name: string
    }
  }
}

const DeployConnection: React.FC<DeployConnectionProps> = (props) => {
  const { changeRequest } = props
  const accessLevels: ChangeRequestPageAccessControl = useRoleAccess()
  const humanReadableScheduledTime = new Date(changeRequest.scheduledAt)
  const {
    data: changerequestStatusData,
    error: changerequestStatusError,
    isLoading: changerequestStatusLoading,
  } = useSWR<ChangeRequestStatusData>(
    changeRequest ? `/api/changerequeststatus/${changeRequest.jiraId}` : null
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
          {changeRequest.jurisdiction.description} {changeRequest.destType.type}{' '}
          changes requested for {humanReadableScheduledTime.toLocaleString()} ET
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          gap: 4,
          alignItems: 'flex-start',
          marginTop: 4,
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        <Box sx={{ width: { xs: '100%', md: '40%' } }}>
          {accessLevels.canRunHealthCheck && (
            <HealthCheck
              destId={changeRequest.destId}
              destTypeId={changeRequest.destType.typeId}
            />
          )}
          {accessLevels.canDeployChange &&
            status === JIRA_STATUS_FOR_DEPLOY && (
              <DeployConfirmation {...changeRequest} />
            )}
          <ViewChangeRequestTicket
            changeScheduledAt={changeRequest.scheduledAt}
            status={status}
            jiraUrl={props.jiraUrl}
            jiraId={changeRequest.jiraId}
          />
          {status !== JIRA_STATUS_FOR_DEPLOY &&
            accessLevels.canRescheduleRequest && (
              <MakeChanges {...changeRequest} />
            )}
        </Box>
        <Box sx={{ width: { xs: '100%', md: '60%' } }}>
          {accessLevels.canViewDetails && (
            <DetailsChangeRequest changeRequestData={changeRequest} />
          )}
        </Box>
      </Box>
    </>
  )
}

export default DeployConnection
