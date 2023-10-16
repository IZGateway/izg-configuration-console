import * as React from 'react'
import {
  Card,
  CardHeader,
  CardContent,
  Divider,
  Typography,
} from '@mui/material'
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
    data: passwordDiffData,
    error: passwordDiffError,
    isLoading: passwordDiffLoading,
  } = useSWR(
    `/api/changerequest/checkPasswordDifference/${params.destTypeId}/${params.destId}`
  )

  if (destError || passwordDiffError)
    throw new Error(destError.message || passwordDiffError.message)
  if (isDestLoading || passwordDiffLoading) return <div>loading...</div>

  console.log(passwordDiffData)

  return (
    <div>
      <Card sx={{ minWidth: 275, borderRadius: '0px 0px 30px 30px' }}>
        <CardHeader
          title={
            <Typography component="h2" sx={{ fontWeight: 'bold' }} variant="h6">
              Details Change Request
            </Typography>
          }
        />
        <Divider />
        <CardContent>
          <Details
            existingValue={_.set(existingValue, 'password', '.........')}
            submittingValue={_.set(
              params.submittingValue,
              'password',
              '.........'
            )}
            isPasswordDifference={passwordDiffData}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default DetailsChangeRequest
