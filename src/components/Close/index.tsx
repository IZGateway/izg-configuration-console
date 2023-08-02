import * as React from 'react'
import { Button } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

const Close = () => {
  const handleClose = (event) => {
    event.preventDefault()
    history.back()
  }

  return (
    <Button
      variant="text"
      color="primary"
      sx={{ float: 'right', marginTop: -8 }}
      onClick={handleClose}
      id="close"
    >
      CLOSE
      <CloseIcon sx={{ marginLeft: 1 }} />
    </Button>
  )
}

export default Close
