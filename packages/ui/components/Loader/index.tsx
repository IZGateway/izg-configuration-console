import * as React from 'react'
import CircularProgress from '@mui/material/CircularProgress'

const Loader = () => {
  return (
    <>
      <CircularProgress color="success" sx={{ position: 'absolute' }} />
    </>
  )
}

export default Loader
