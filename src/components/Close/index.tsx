import * as React from 'react'
import { Button } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CombinedContext from '../../contexts/app'
import { useRouter } from 'next/router'

const Close = () => {
  const { clearValue } = React.useContext(CombinedContext)
  const router = useRouter()
  const handleClose = () => {
    clearValue()
    router.push('/manage')
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
