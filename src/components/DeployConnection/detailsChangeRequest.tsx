import * as React from 'react'
import { Card, CardHeader, CardContent, Divider } from '@mui/material'
import Details from '../ChangeRequest/details'
import _ from 'lodash'
import { DestinationChangeRequest } from '../../lib/type/DestinationChangeRequest'

const DetailsChangeRequest = (params: {
  changeRequestData: DestinationChangeRequest
}) => {
  const changeRequestData = params.changeRequestData
  return (
    <div>
      <Card sx={{ minWidth: 275, borderRadius: '0px 0px 30px 30px' }}>
        <CardHeader title="Change Request Details" />
        <Divider />
        <CardContent>
          <Details
            existingValue={_.set(
              changeRequestData.current,
              'password',
              '.........'
            )}
            submittingValue={_.set(
              changeRequestData.requested,
              'password',
              '.........'
            )}
            isPasswordDifferent={changeRequestData.isPasswordDifferent}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default DetailsChangeRequest
