/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'
import { Tooltip, Box, Fab } from '@mui/material'
import { useState } from 'react'
import palette from '../../styles/theme/palette'
import SaveIcon from '@mui/icons-material/Save'
import ResetDialog from './resetDialog'
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined'
import CachedIcon from '@mui/icons-material/Cached'

const FloatingActionButtons = (props: {
  toggleTestDrawer: any
  isFormChanged: boolean
  saveDraft: any
  isResetButtonDisabled: boolean
  resetDraft: any
}) => {
  const [openReset, setOpenReset] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    handleResize() // Set initial value
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleClickOpenReset = () => {
    setOpenReset(true)
  }

  const handleCloseReset = () => {
    setOpenReset(false)
  }
  const resetDraftValues = () => {
    props.resetDraft()
    handleCloseReset()
  }

  return (
    <Box>
      <Tooltip arrow placement={isMobile ? 'top' : 'left'} title="Test">
        <Fab
          size="small"
          sx={{
            position: 'fixed',
            ...(isMobile
              ? {
                  bottom: 16,
                  right: 16,
                  zIndex: 1000,
                }
              : {
                  bottom: 160,
                  right: 16,
                }),
            backgroundColor: palette.white,
            border: `1px solid ${palette.white}`,
            '&:hover': {
              border: `1.5px solid ${palette.primary}`,
              transition: '200ms',
            },
          }}
          aria-label="test"
          onClick={props.toggleTestDrawer}
          disabled={!props.isFormChanged}
        >
          <MonitorHeartOutlinedIcon color="primary" fontSize="small" />
        </Fab>
      </Tooltip>
      <Tooltip arrow placement={isMobile ? 'top' : 'left'} title="Save">
        <Fab
          size="small"
          sx={{
            position: 'fixed',
            ...(isMobile
              ? {
                  bottom: 16,
                  right: 66,
                  zIndex: 1000,
                }
              : {
                  bottom: 96,
                  right: 16,
                }),
            backgroundColor: palette.white,
            border: `1px solid ${palette.white}`,
            '&:hover': {
              border: `1.5px solid ${palette.primary}`,
              transition: '200ms',
            },
          }}
          aria-label="save"
          onClick={props.saveDraft}
          disabled={!props.isFormChanged}
        >
          <SaveIcon color="primary" fontSize="small" />
        </Fab>
      </Tooltip>
      <Tooltip arrow placement={isMobile ? 'top' : 'left'} title="Reset">
        <Fab
          size="small"
          sx={{
            position: 'fixed',
            ...(isMobile
              ? {
                  bottom: 16,
                  right: 116,
                  zIndex: 1000,
                }
              : {
                  bottom: 32,
                  right: 16,
                }),
            backgroundColor: palette.white,
            border: `1px solid ${palette.white}`,
            '&:hover': {
              border: `1.5px solid ${palette.primary}`,
              transition: '200ms',
            },
          }}
          aria-label="reset"
          onClick={handleClickOpenReset}
          disabled={props.isResetButtonDisabled}
        >
          <CachedIcon color="primary" fontSize="small" />
        </Fab>
      </Tooltip>

      <ResetDialog
        open={openReset}
        handleClose={handleCloseReset}
        resetDraft={resetDraftValues}
      />
    </Box>
  )
}

export default FloatingActionButtons
