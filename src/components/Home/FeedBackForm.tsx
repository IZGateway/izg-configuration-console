import React, { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import { RateReviewOutlined } from '@mui/icons-material'
import {
  RadioGroup,
  Rating,
  FormControlLabel,
  Radio,
  TextField,
  Button,
  Typography,
  Box,
} from '@mui/material'

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
const FeedbackForm = () => {
  const [open, setOpen] = useState(false)

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const handleSubmit = () => {
    // Handle form submission here
    handleClose()
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
          <RateReviewOutlined color="primary" />
        </IconButton>
        <Typography align="center">
          Give Us
          <br />
          Feedback!
        </Typography>
      </Box>
      <Dialog
        PaperProps={{
          style: customPaperStyles,
        }}
        open={open}
        onClose={handleClose}
      >
        <DialogTitle>Feedback Form</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Box>
              <Typography variant="body1">
                1. Hows your overall experience with your application?
              </Typography>
              <>
                <Rating />
              </>
            </Box>
            <Box>
              <Typography variant="body1">
                2. Do you think the application is easy to understand?
              </Typography>
              <Rating />
            </Box>
            <Box>
              <Typography variant="body1">
                3. How often do you use IZG?
              </Typography>
              <RadioGroup>
                <FormControlLabel
                  value="Not really"
                  control={<Radio />}
                  label="Not really"
                />
                <FormControlLabel
                  value="Moderate"
                  control={<Radio />}
                  label="Moderate"
                />
                <FormControlLabel
                  value="Alot"
                  control={<Radio />}
                  label="Alot"
                />
              </RadioGroup>
            </Box>
            <Box>
              <Typography variant="body1">
                4. Any suggestions for our application?
              </Typography>
              <TextField multiline rows={4} variant="outlined" fullWidth />
            </Box>
          </form>
        </DialogContent>
        <DialogActions sx={{ mr: 1 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default FeedbackForm
