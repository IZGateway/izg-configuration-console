import * as React from 'react'
import CircularProgress from '@mui/material/CircularProgress'
import { Backdrop } from '@mui/material'

export interface LoaderProps {
  open: boolean
}

const Loader = (props: LoaderProps) => {
  return (
    <>
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={props.open}
        // onClick={handleClose}
      >
        <CircularProgress color="success" sx={{ position: 'absolute' }} />
      </Backdrop>
    </>
  )
}

export default Loader
