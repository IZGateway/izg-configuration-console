import * as React from 'react'
import _ from 'lodash'
import {
  Card,
  CardHeader,
  CardContent,
  Divider,
  Typography,
} from '@mui/material'
import Details from '../ChangeRequest/details'

const Verify = (props: any) => {
  let submittingValue
  let existingValue
  let isPasswordDifferent

  if (props.value.newPassword === '' && props.value.confirmPassword === '') {
    submittingValue = _.omit({ ...props.value, password: '.........' }, [
      'confirmPassword',
      'newPassword',
    ])
    existingValue = _.omit({ ...props, password: '.........' }, [
      'confirmPassword',
      'newPassword',
    ])
    isPasswordDifferent = false
  } else {
    submittingValue = _.omit(
      { ...props.value, password: props.value.newPassword },
      ['confirmPassword', 'newPassword']
    )
    existingValue = _.omit({ ...props, password: '.........' }, [
      'confirmPassword',
      'newPassword',
    ])
    isPasswordDifferent = true
  }
  return (
    <div>
      <Card sx={{ minWidth: 275, borderRadius: '0px 0px 30px 30px' }}>
        <CardHeader
          title={
            <Typography component="h2" sx={{ fontWeight: 'bold' }} variant="h6">
              Review Changes
            </Typography>
          }
        />
        <Divider />
        <CardContent>
          <div>
            Please double-check that all changes are accurate. If unsure,
            consult with a colleague or supervisor. Your changes can
            significantly impact this endpoint&apos;s connectivity, so it is
            important to get them right. Thank you for reviewing your changes
            before submission.
          </div>
          <Details
            existingValue={existingValue}
            submittingValue={submittingValue}
            isPasswordDifferent={isPasswordDifferent}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default Verify
