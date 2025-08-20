import React, { useState } from 'react'
import {
  Box,
  Typography,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from '@mui/material'
import { Close, PolicyOutlined } from '@mui/icons-material'

import palette from '../../styles/theme/palette'
import Link from 'next/link'

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
const LegalDocumentation = () => {
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
        gap={2}
      >
        <IconButton sx={actionButtonStyle} onClick={handleClickOpen}>
          <PolicyOutlined color="primary" />
        </IconButton>
        <Typography fontSize={{ xs: '0.8rem', md: '1rem' }} align="center">
          Policy
          <br />
          Infrastructure
        </Typography>
      </Box>
      <Dialog
        PaperProps={{
          style: customPaperStyles,
        }}
        open={open}
        onClose={handleClose}
      >
        <DialogTitle>
          {' '}
          IZ Gateway Policy Infrastructure
          <IconButton
            onClick={handleClose}
            sx={{ float: 'right', color: 'grey' }}
          >
            <Close sx={{ float: 'right', color: 'grey' }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            The IZ Gateway offers a standardized policy infrastructure for data
            exchange between IIS and with multi-jurisdictional vaccine
            providers. To find legal agreements and supporting policy
            documentation, please visit{' '}
            <Link
              href="https://cdcpartners.sharepoint.com/:f:/r/sites/NCIRD/PAP/IIS/IZ%20Gateway/IZG%20Legal%20Agreements?csf=1&web=1&e=3UgLNm"
              target="_blank"
            >
              IZG Legal Agreements
            </Link>
          </Typography>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LegalDocumentation
