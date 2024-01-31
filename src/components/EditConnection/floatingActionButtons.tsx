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
      <Fab
        sx={{
          position: 'absolute',
          bottom: 160,
          right: 16,
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
        <Tooltip arrow placement="bottom" title="Test">
          <MonitorHeartOutlinedIcon color="primary" fontSize="small" />
        </Tooltip>
      </Fab>
      <Fab
        sx={{
          position: 'absolute',
          bottom: 96,
          right: 16,
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
        <Tooltip arrow placement="bottom" title="Save">
          <SaveIcon color="primary" fontSize="small" />
        </Tooltip>
      </Fab>
      <Fab
        sx={{
          position: 'absolute',
          bottom: 32,
          right: 16,
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
        <Tooltip arrow placement="bottom" title="Reset">
          <CachedIcon color="primary" fontSize="small" />
        </Tooltip>
      </Fab>
      <ResetDialog
        open={openReset}
        handleClose={handleCloseReset}
        resetDraft={resetDraftValues}
      />
    </Box>
  )
}

export default FloatingActionButtons
