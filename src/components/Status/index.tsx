import React from 'react'
import { Typography, Box } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

interface statusProps {
  status: {
    status: string
  }
  color: boolean
}

const Status = (props: statusProps) => {
  if (props.color) {
    return (
      <Typography
        gutterBottom
        variant="body1"
        sx={{ color: '#757575' }}
        component="div"
      >
        {!props.status ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography component="div">Not Connected</Typography>
            <ErrorOutlineIcon fontSize="small" sx={{ marginLeft: 0.5 }} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography component="div">Connected</Typography>
            <CheckIcon fontSize="small" sx={{ marginLeft: 0.5 }} />
          </Box>
        )}
      </Typography>
    )
  } else {
    return (
      <Typography gutterBottom variant="body1" component="div">
        {!props.status ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography>Not Connected</Typography>
            <ErrorOutlineIcon fontSize="small" sx={{ marginLeft: 0.5 }} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography>Connected</Typography>
            <CheckIcon fontSize="small" sx={{ marginLeft: 0.5 }} />
          </Box>
        )}
      </Typography>
    )
  }
}

export default Status
