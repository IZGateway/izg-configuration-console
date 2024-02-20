import React, { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import { ArrowForward, ExpandMore } from '@mui/icons-material'
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Typography,
  Divider,
} from '@mui/material'
import palette from '../../styles/theme/palette'

const customPaperStyles = {
  borderRadius: '0px 0px 30px 30px',
  boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
  paddingBottom: '16px',
}

const Requirements = () => {
  const [open, setOpen] = useState(false)

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const [expandedAccordion, setExpandedAccordion] = useState(null)

  const handleChange = (panel) => (event, isExpanded) => {
    setExpandedAccordion(isExpanded ? panel : null)
  }
  return (
    <div>
      <Button
        variant="outlined"
        color="primary"
        size="small"
        onClick={handleClickOpen}
        endIcon={<ArrowForward />}
      >
        Learn More
      </Button>
      <Dialog
        PaperProps={{
          style: customPaperStyles,
        }}
        open={open}
        onClose={handleClose}
      >
        <DialogTitle>Requirements</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            We outline the essential criteria and specifications for using our
            products/services effectively. Understanding these requirements
            ensures a smooth and optimal user experience, allowing you to
            maximize the benefits of our offerings.
          </Typography>
          <Divider sx={{ mt: 2, mb: 2 }} />
          <Typography gutterBottom>
            1. Device Compatibility: Ensure compatibility with your devices and
            operating systems. Our products/services may require specific
            hardware specifications or software versions to function properly.
            Check the compatibility list provided to ensure seamless integration
            with your devices.
          </Typography>
          <Typography gutterBottom>
            2. Internet Connection: A stable internet connection is often
            necessary to access and utilize our online products/services.
            Whether you're streaming content, accessing cloud-based tools, or
            downloading updates, a reliable internet connection ensures
            uninterrupted access and optimal performance.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ mr: 1 }}>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default Requirements
