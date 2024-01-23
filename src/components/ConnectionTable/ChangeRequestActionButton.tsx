import { Tooltip, IconButton } from '@mui/material'
import Link from 'next/link'
import EditIcon from '@mui/icons-material/Edit'
import { useSession } from 'next-auth/react'
import PublishedWithChangesIcon from '@mui/icons-material/PublishedWithChanges'
import palette from '../../styles/theme/palette'
import SaveIcon from '@mui/icons-material/Save'
const actionButtonStyle = {
  borderRadius: 90,
  background: palette.white,
  boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
  width: 35,
  height: 35,
  marginRight: 2,
}

const ChangeRequestActionButton = (props: {
  destTypeId: any
  destId: any
  hasChangeRequest: any
  hasActiveDraft: any
  tabIndex: any
}) => {
  const { destId, destTypeId, hasChangeRequest, hasActiveDraft } = props
  const canEdit = !hasChangeRequest && !hasActiveDraft

  const { data: session } = useSession()
  const isAdmin = session?.user.isAdmin
  return (
    <>
      {canEdit && (
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
      )}

      {!canEdit && hasActiveDraft && (
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
              sx={actionButtonStyle}
            >
              <SaveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Link>
      )}

      {!canEdit && !hasActiveDraft && isAdmin && (
        <Link
          href={{
            pathname: `/changerequest/${destTypeId}/${destId}`,
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
      )}
      {!canEdit && !hasActiveDraft && !isAdmin && (
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

export default ChangeRequestActionButton
