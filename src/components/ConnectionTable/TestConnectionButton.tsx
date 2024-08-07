import { Tooltip, IconButton } from '@mui/material'
import Link from 'next/link'
import palette from '../../styles/theme/palette'
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined'

const actionButtonStyle = {
  borderRadius: 90,
  background: palette.white,
  boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
  width: 35,
  height: 35,
  marginRight: 2,
}

const TestConnectionButton = (props: {
  destTypeId: any
  destId: any
  tabIndex: any
}) => {
  return (
    <Link
      tabIndex={props.tabIndex}
      prefetch={false}
      href={{
        pathname: `/test/${props.destTypeId}/${props.destId}`,
      }}
    >
      <Tooltip arrow placement="bottom" title="Test">
        <IconButton
          id={'test_' + props.destTypeId + '_' + props.destId}
          aria-label="test"
          color="primary"
          sx={actionButtonStyle}
        >
          <MonitorHeartOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Link>
  )
}

export default TestConnectionButton
