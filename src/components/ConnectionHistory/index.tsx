import * as React from 'react'
import { Typography, Box, BoxProps } from '@mui/material'
import TestHistory from './testHistory'
import ChangeHistory from './changeHistory'
import ConnectionInfo from './connectionInfo'
import Close from '../Close'
import ViewChangeRequest from './viewChangeRequest'
import useSWR from 'swr'
import _ from 'lodash'

type connectionHistoryProps = {
  destId: string
  destTypeId: string
  status: string
}
const ConnectionHistory = (props: connectionHistoryProps) => {
  const {
    data: changeRequestData,
    error: changeRequestError,
    isLoading: ischangeRequestLoading,
  } = useSWR(`/api/changerequest/${props.destTypeId}/${props.destId}`)
  if (changeRequestError) return <div>failed to load</div>
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
          {!_.isEmpty(changeRequestData) && (
            <ViewChangeRequest
              destId={props.destId}
              destTypeId={props.destTypeId}
            />
          )}
        </Item>

        <Item sx={{ flexGrow: 1 }}>
          <TestHistory destId={props.destId} destTypeId={props.destTypeId} />
          <ChangeHistory destId={props.destId} destTypeId={props.destTypeId} />
        </Item>
      </Box>
    </div>
  )
}

export default ConnectionHistory
