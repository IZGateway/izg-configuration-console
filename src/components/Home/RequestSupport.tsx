import React from 'react'
import { IconButton, Typography, Box } from '@mui/material'
import ContactSupportOutlinedIcon from '@mui/icons-material/ContactSupportOutlined'
import palette from '../../styles/theme/palette'

const actionButtonStyle = {
  borderRadius: 90,
  background: palette.white,
  boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
  width: 50,
  height: 50,
  transition: 'transform 0.15s ease-in-out',
  '&:hover': {
    transform: 'scale3d(1.15, 1.15, 1)',
  },
}

const RequestSupport = () => {
  const subject = 'Configuration Console Support Request'
  const body = ''
  const mailToLink = `mailto:izgateway@cdc.gov${
    subject ? `?subject=${encodeURIComponent(subject)}` : ''
  }${body ? `${subject ? '&' : '?'}body=${encodeURIComponent(body)}` : ''}`
  return (
    <div>
      <Box
        display={'flex'}
        flexDirection={'column'}
        alignItems={'center'}
        justifyContent={'center'}
        gap={2}
      >
        <IconButton sx={actionButtonStyle} href={mailToLink} target="_blank">
          <ContactSupportOutlinedIcon color="primary" />
        </IconButton>
        <Typography align="center">
          Request <br /> Support
        </Typography>
      </Box>
    </div>
  )
}

export default RequestSupport
