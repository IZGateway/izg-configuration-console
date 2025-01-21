import { Tooltip, IconButton } from '@mui/material'
import Link from 'next/link'
import EditIcon from '@mui/icons-material/Edit'
import PublishedWithChangesIcon from '@mui/icons-material/PublishedWithChanges'
import palette from '../../styles/theme/palette'
import SaveIcon from '@mui/icons-material/Save'
import useSWR from 'swr'
import moment from 'moment'
import useRoleAccess from '../../lib/security/useRoleAccess'
import { ManageConnectionsPageAccessControl } from '../../lib/type/PageAccessControls'
const actionButtonStyle = {
  borderRadius: 90,
  background: palette.white,
  boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
  width: 35,
  height: 35,
  marginRight: 2,
}
const draftButtonStyle = {
  borderRadius: 90,
  background: palette.primary,
  color: palette.white,
  boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
  width: 35,
  height: 35,
  marginRight: 2,
  '&:hover': {
    background: palette.primaryDark,
    color: palette.white,
  },
}

const publishButtonStyle = {
  borderRadius: 90,
  background: palette.primaryDark,
  color: palette.white,
  boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
  width: 35,
  height: 35,
  marginRight: 2,
  '&:hover': {
    background: '#021a2d',
    color: palette.white,
  },
}

const ChangeRequestActionButtons = (props: {
  destTypeId: number
  destId: string
  hasChangeRequest: boolean
  hasActiveDraft: boolean
  tabIndex: number
}) => {
  const { destId, destTypeId, hasChangeRequest, hasActiveDraft } = props
  const canEdit = !hasChangeRequest && !hasActiveDraft
  const accessLevels: ManageConnectionsPageAccessControl = useRoleAccess()
  const {
    data: draftData,
    error: draftError,
    isLoading: isDraftLoading,
  } = useSWR(
    hasActiveDraft
      ? `/api/destinationdraft/${props.destTypeId}/${props.destId}`
      : null
  )
  if (draftError) throw new Error(draftError.message)
  if (isDraftLoading) return <div>loading...</div>
  const date =
    draftData &&
    moment(new Date(draftData.scheduledAt)).format('MMM DD, YYYY [at] h:mm A')

  return (
    <>
      {canEdit && accessLevels.canEditConnection && (
        <Link
          prefetch={false}
          tabIndex={props.tabIndex}
          href={{
            pathname: `/edit/${destTypeId}/${props.destId}`,
          }}
        >
          <Tooltip arrow placement="bottom" title="Edit">
            <IconButton
              id={'edit_' + props.destTypeId + '_' + props.destId}
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

      {!canEdit && hasActiveDraft && accessLevels.canEditConnection && (
        <Link
          prefetch={false}
          tabIndex={props.tabIndex}
          href={{
            pathname: `/edit/${destTypeId}/${props.destId}`,
          }}
        >
          <Tooltip
            arrow
            placement="left"
            title={`Draft Saved with edits from ${draftData.requestedBy} ${date}`}
          >
            <IconButton
              id={props.destTypeId + '_' + props.destId}
              aria-label="draft"
              color="primary"
              sx={draftButtonStyle}
            >
              <SaveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Link>
      )}

      {!canEdit && !hasActiveDraft && accessLevels.canViewChangeRequest && (
        <Link
          href={{
            pathname: `/changerequest/${destTypeId}/${destId}`,
          }}
        >
          <Tooltip arrow placement="left" title="Change Request">
            <IconButton
              id={'changerequest_' + props.destTypeId + '_' + props.destId}
              aria-label="changerequest"
              color="primary"
              sx={publishButtonStyle}
            >
              <PublishedWithChangesIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Link>
      )}
    </>
  )
}

export default ChangeRequestActionButtons
