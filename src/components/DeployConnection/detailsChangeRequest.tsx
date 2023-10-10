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

////destination_change_request -------submitting change
////destination----existing change
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

  if (destError) return <div>failed to load</div>
  if (isDestLoading) return <div>loading...</div>

  // let submittingValue
  // let existingValue

  // if (params.value.newPassword === '' && params.value.confirmPassword === '') {
  //   submittingValue = { ...params.value, password: '.........' }
  //   existingValue = { ...params, password: '.........' }
  // } else {
  //   submittingValue = { ...params.value, password: params.value.newPassword }
  //   existingValue = { ...params, password: '.........' }
  // }

  // delete submittingValue.confirmPassword
  // delete submittingValue.newPassword
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
            existingValue={existingValue}
            submittingValue={params.submittingValue}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default DetailsChangeRequest
