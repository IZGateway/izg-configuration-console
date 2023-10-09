import { Tooltip, IconButton } from '@mui/material'
import Link from 'next/link'
import EditIcon from '@mui/icons-material/Edit'
import useSWR from 'swr'
import { useEffect, useState } from 'react'
import _ from 'lodash'

const actionButtonStyle = {
  borderRadius: 90,
  background: '#FFFFF',
  boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
  width: 35,
  height: 35,
  marginRight: 2,
}

const EditButton = (params: { destTypeId: any; destId: any }) => {
  const [canEdit, setCanEdit] = useState(false)
  const { data, error, isLoading } = useSWR(
    `/api/changerequest/${params.destTypeId}/${params.destId}`
  )

  useEffect(() => {
    setCanEdit(_.isEmpty(data))
  }, [data])

  if (error) return <div>failed to load</div>
  if (isLoading) return <div>loading...</div>
  return (
    <>
      {canEdit ? (
        <Link
          href={{
            pathname: `/edit/${params.destTypeId}/${params.destId}`,
          }}
        >
          <Tooltip arrow placement="bottom" title="Edit">
            <IconButton
              id="edit"
              aria-label="edit"
              color="primary"
              disabled={!canEdit}
              sx={actionButtonStyle}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Link>
      ) : (
        <Tooltip arrow placement="bottom" title="Edit">
          <IconButton
            id="edit"
            aria-label="edit"
            color="primary"
            disabled={!canEdit}
            sx={actionButtonStyle}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </>
  )
}

export default EditButton
