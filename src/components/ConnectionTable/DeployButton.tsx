import { Tooltip, IconButton } from '@mui/material'
import Link from 'next/link'
import ConnectWithoutContactIcon from '@mui/icons-material/ConnectWithoutContact'
const actionButtonStyle = {
  borderRadius: 90,
  background: '#FFFFF',
  boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
  width: 35,
  height: 35,
  marginRight: 2,
}

const DeployButton = (params: { destTypeId: any; destId: any }) => {
  return (
    <>
      <Link
        href={{
          pathname: `/deploy/${params.destTypeId}/${params.destId}`,
        }}
      >
        <Tooltip arrow placement="bottom" title="Deploy">
          <IconButton
            id="deploy"
            aria-label="deploy"
            color="primary"
            avel6
            sx={actionButtonStyle}
          >
            <ConnectWithoutContactIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Link>
    </>
  )
}

export default DeployButton
