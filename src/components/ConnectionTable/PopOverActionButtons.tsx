import {
  IconButton,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Tooltip,
} from '@mui/material'
import Link from 'next/link'

import palette from '../../styles/theme/palette'
import WarningIcon from '@mui/icons-material/Warning'
import HistoryIcon from '@mui/icons-material/History'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import React, { useState } from 'react'
import MaintenanceDialog from './MaintenanceDialog'
const actionButtonStyle = {
  borderRadius: 90,
  background: palette.white,
  boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
  width: 35,
  height: 35,
  marginRight: 2,
}
const PopOverActionButtons = (props: {
  destTypeId: any
  destId: any
  status: any
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const open = Boolean(anchorEl)

  const [openMaintenance, setOpenMaintenance] = useState(false)
  const openMaintenanceDialog = () => {
    setOpenMaintenance(true)
    setAnchorEl(null)
  }
  const closeMaintenanceDialog = () => {
    setOpenMaintenance(false)
  }

  return (
    <>
      <Tooltip title="More Options" arrow>
        <IconButton
          id={'more_actions_' + props.destTypeId + '_' + props.destId}
          aria-label="moreactions"
          color="secondary"
          sx={actionButtonStyle}
          onClick={handleClick}
          aria-controls={open ? 'basic-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{ marginTop: '4px' }}
        slotProps={{
          root: { sx: { '.MuiList-root': { padding: '0px' } } },
        }}
      >
        <MenuItem
          id={'history_' + props.destTypeId + '_' + props.destId}
          component={Link}
          href={`/history/${props.destTypeId}/${props.destId}`}
          onClick={handleClose}
          sx={{ borderBottom: `1px solid ${palette.divider}` }}
        >
          <ListItemIcon>
            <HistoryIcon htmlColor={palette.secondary} fontSize="small" />
          </ListItemIcon>
          <ListItemText>History</ListItemText>
        </MenuItem>
        <MenuItem onClick={openMaintenanceDialog}>
          <ListItemIcon>
            <WarningIcon htmlColor={palette.error} fontSize="small" />
          </ListItemIcon>
          <ListItemText>Maintenance</ListItemText>
        </MenuItem>
      </Menu>
      <MaintenanceDialog
        open={openMaintenance}
        handleClose={closeMaintenanceDialog}
        destId={props.destId}
        destTypeId={props.destTypeId}
      />
    </>
  )
}

export default PopOverActionButtons
