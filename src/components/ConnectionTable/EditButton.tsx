import { Tooltip, IconButton } from '@mui/material'
import Link from 'next/link'
import EditIcon from '@mui/icons-material/Edit'
import PublishedWithChangesIcon from '@mui/icons-material/PublishedWithChanges'
import { useSession } from 'next-auth/react'
const actionButtonStyle = {
  borderRadius: 90,
  background: '#FFFFF',
  boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
  width: 35,
  height: 35,
  marginRight: 2,
}

const EditButton = (props: {
  destTypeId: any
  destId: any
  hasChangeRequest: any
  tabIndex: any
}) => {
  const { data: session } = useSession()
  const { destTypeId, hasChangeRequest } = props
  const canEdit = !hasChangeRequest

  return (
    <>
      {canEdit ? (
        <Link
          prefetch={false}
          tabIndex={props.tabIndex}
          href={{
            pathname: `/edit/${destTypeId}/${props.destId}`,
          }}
        >
          <Tooltip arrow placement="bottom" title="Edit">
            <IconButton
              id={props.destTypeId + '_' + props.destId}
              aria-label="edit"
              color="primary"
              disabled={!canEdit}
              sx={actionButtonStyle}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Link>
      ) : session?.user?.isAdmin ? (
        <Link
          prefetch={false}
          href={{
            pathname: `/changerequest/${props.destTypeId}/${props.destId}`,
          }}
        >
          <Tooltip arrow placement="bottom" title="Change Request">
            <IconButton
              id="changerequest"
              aria-label="changerequest"
              color="primary"
              sx={actionButtonStyle}
            >
              <PublishedWithChangesIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Link>
      ) : (
        <IconButton
          id={props.destTypeId + '_' + props.destId}
          aria-label="edit"
          color="primary"
          disabled={!canEdit}
          sx={actionButtonStyle}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      )}
    </>
  )
}

export default EditButton
