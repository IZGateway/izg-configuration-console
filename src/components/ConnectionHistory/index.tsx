import * as React from 'react'
import { Typography, Box, BoxProps } from '@mui/material'
import TestHistory from './testHistory'
import ChangeHistory from './changeHistory'
import ConnectionInfo from './connectionInfo'
import Close from '../Close'
import ViewChangeRequest from './viewChangeRequest'
import useSWR from 'swr'
import _ from 'lodash'
import useRoleAccess from '../../lib/security/useRoleAccess'

type connectionHistoryProps = {
  destId: string
  destTypeId: string
  status: string
}
const ConnectionHistory = (props: connectionHistoryProps) => {
  const accessLevels = useRoleAccess('history')
  // Gates the change-request panel on the SAME capability the GET this panel
  // depends on (`/api/changerequest/[...slug].ts`) and the page it links to
  // both already enforce — `history.canViewChangeRequest` used to be a
  // separate, always-identical flag that could never mean anything different
  // (removed in the IGDD-3545/3548 review, PR #771, Anusha).
  const changerequestAccess = useRoleAccess('changerequest')
  const {
    data: changeRequestData,
    error: changeRequestError,
    isLoading: ischangeRequestLoading,
  } = useSWR(
    changerequestAccess.canViewDetails
      ? `/api/changerequest/${props.destTypeId}/${props.destId}`
      : null
  )
  // Thrown, not returned as a div: TestHistory and ChangeHistory in this same
  // directory already throw on their own fetch errors specifically so the
  // ErrorBoundary already mounted around this component (history/[...slug].tsx)
  // catches it, logs it, and renders the real ErrorPage - matching that
  // convention instead of a silent, unstyled, unlogged dead end.
  if (changeRequestError) throw new Error(changeRequestError.message)
  if (ischangeRequestLoading) return <div>loading...</div>

  function Item(props: BoxProps) {
    const { sx, ...other } = props
    return (
      <Box
        sx={{
          ...sx,
        }}
        {...other}
      />
    )
  }

  return (
    <div>
      <Close />
      <Box sx={{ marginTop: 4 }}>
        <Typography
          variant="h1"
          fontWeight={700}
          fontSize="32px"
          id="title-history"
        >
          Connection History
        </Typography>
        <Typography variant="body1">
          Find users, view the test history and view additional information.
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          gap: 4,
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        <Item
          sx={{
            width: { xs: '100%', md: '40%' },
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <ConnectionInfo
            destId={props.destId}
            destTypeId={props.destTypeId}
            status={props.status}
          />
          {!_.isEmpty(changeRequestData) &&
            changerequestAccess.canViewDetails && (
              <ViewChangeRequest
                destId={props.destId}
                destTypeId={props.destTypeId}
              />
            )}
        </Item>

        <Item sx={{ flexGrow: 1 }}>
          {accessLevels.canViewHubStatusHistory && (
            <TestHistory destId={props.destId} destTypeId={props.destTypeId} />
          )}
          {accessLevels.canViewChangeHistory && (
            <ChangeHistory destId={props.destId} destTypeId={props.destTypeId} />
          )}
        </Item>
      </Box>
    </div>
  )
}

export default ConnectionHistory
