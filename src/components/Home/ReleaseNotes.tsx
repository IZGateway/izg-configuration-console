import React, { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import { NotesOutlined } from '@mui/icons-material'
import { Button, Typography, Box, Divider } from '@mui/material'

import palette from '../../styles/theme/palette'

const customPaperStyles = {
  borderRadius: '0px 0px 30px 30px',
  boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
  paddingBottom: '16px',
}
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
const ReleaseNotes = () => {
  const [open, setOpen] = useState(false)

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <div>
      <Box
        display={'flex'}
        flexDirection={'column'}
        alignItems={'center'}
        justifyContent={'center'}
        gap={1}
      >
        <IconButton sx={actionButtonStyle} onClick={handleClickOpen}>
          <NotesOutlined color="primary" />
        </IconButton>
        <Typography>Release Notes</Typography>
      </Box>
      <Dialog
        PaperProps={{
          style: customPaperStyles,
        }}
        open={open}
        onClose={handleClose}
      >
        <DialogTitle>Release Notes</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            <strong>Version 1.0</strong>{' '}
          </Typography>
          <Typography gutterBottom>
            We are excited to announce the first release of "IZ Gateway"! This
            release marks a significant milestone in our journey towards
            providing a robust and scalable gateway solution for seamless
            integration and communication within your network infrastructure.
          </Typography>
          <Divider sx={{ mt: 2, mb: 2 }} />
          <Typography gutterBottom>
            <strong>Key Features:</strong>
          </Typography>
          <Typography gutterBottom variant="body2">
            <strong>Secure Communication:</strong>{' '}
            <Typography variant="body2">
              "IZ Gateway" ensures secure communication between different
              devices and systems within your network, utilizing the latest
              encryption standards to safeguard your data.
            </Typography>
          </Typography>
          <Typography gutterBottom variant="body2">
            <strong>Unified Interface:</strong>
            <Typography variant="body2">
              {' '}
              With a user-friendly and intuitive interface, managing and
              monitoring your network connections has never been easier. "IZ
              Gateway" provides a unified platform for configuration and
              administration, streamlining your workflow.
            </Typography>
          </Typography>
          <Typography gutterBottom variant="body2">
            <strong>Flexible Integration:</strong>
            <Typography variant="body2">
              Whether you're connecting IoT devices, sensors, or legacy systems,
              "IZ Gateway" offers versatile integration options to accommodate a
              wide range of devices and protocols, ensuring compatibility and
              interoperability.
            </Typography>
          </Typography>
          <Typography gutterBottom variant="body2">
            <strong>Scalable Architecture:</strong>
            <Typography variant="body2">
              {' '}
              Built on a scalable architecture, "IZ Gateway" is designed to grow
              with your business needs. Easily scale your network infrastructure
              and add new devices without compromising performance or
              reliability.
            </Typography>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ mr: 1 }}>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default ReleaseNotes
