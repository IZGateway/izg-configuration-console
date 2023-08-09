import * as React from 'react'
import { Button } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CombinedContext from '../../contexts/app'

const Close = () => {
  const { clearValue } = React.useContext(CombinedContext)
  const handleClose = (event) => {
    event.preventDefault()
    history.back()
    clearValue()
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
