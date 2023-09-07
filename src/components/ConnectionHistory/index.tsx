import * as React from 'react'
import { Typography, Box, BoxProps } from '@mui/material'
import TestHistory from './testHistory'
import ChangeHistory from './changeHistory'
import ConnectionInfo from './connectionInfo'
import Close from '../Close'

const ConnectionHistory = (props: any) => {
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
      <Box sx={{ display: 'flex', gap: 4 }}>
        <Item sx={{ width: '40%' }}>
          <ConnectionInfo
            destId={props.destId}
            destType={props.destType}
            status={props.status}
          />
        </Item>
        <Item sx={{ flexGrow: 1 }}>
          <TestHistory destId={props.destId} />
          <ChangeHistory destId={props.destId} />
        </Item>
      </Box>
    </div>
  )
}

export default ConnectionHistory
