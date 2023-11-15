import * as React from 'react'
import { Card, CardHeader, CardContent, Divider } from '@mui/material'
import useSWR from 'swr'
import Details from '../ChangeRequest/details'
import _ from 'lodash'

const DetailsChangeRequest = (params: {
  destTypeId: any
  destId: any
  submittingValue: any
}) => {
  const {
    data: existingValue,
    error: destError,
    isLoading: isDestLoading,
  } = useSWR(`/api/destinations/${params.destTypeId}/${params.destId}`)

  const {
    data,
    error: passwordDiffError,
    isLoading: passwordDiffLoading,
  } = useSWR(
    `/api/changerequest/passwordComparison/${params.destTypeId}/${params.destId}`
  )

  if (destError || passwordDiffError)
    throw new Error(destError.message || passwordDiffError.message)
  if (isDestLoading || passwordDiffLoading) return <div>loading...</div>

  return (
    <div>
      <Card sx={{ minWidth: 275, borderRadius: '0px 0px 30px 30px' }}>
        <CardHeader title="Details Change Request" />
        <Divider />
        <CardContent>
          <Details
            existingValue={_.set(existingValue, 'password', '.........')}
            submittingValue={_.set(
              params.submittingValue,
              'password',
              '.........'
            )}
            isPasswordDifferent={data.isPasswordDifferent}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default DetailsChangeRequest
