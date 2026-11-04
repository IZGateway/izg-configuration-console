import * as React from 'react'
import { Backdrop } from '@mui/material'
import palette from '../../styles/theme/palette'
import LogoSpinner from './LogoSpinner'

export interface LoaderProps {
  open: boolean
}

const Loader = (props: LoaderProps) => {
  return (
    <>
      <Backdrop
        sx={{
          color: palette.white,
          // Above the navigation drawer, header bar and dialogs, so the whole
          // screen is covered while loading.
          zIndex: (theme) => theme.zIndex.modal + 1,
        }}
        open={props.open}
      >
        <LogoSpinner />
      </Backdrop>
    </>
  )
}

export default Loader
