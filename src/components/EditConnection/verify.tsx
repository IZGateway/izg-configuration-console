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
              Review & Submit Changes
            </Typography>
          }
        />
        <Divider />
        <CardContent>
          <div>
            Before you submit your edits, it&apos;s important to double-check
            that you&apos;ve made all the changes you intended to make. Once you
            hit the &quot;submit&quot; button, your changes will be saved and it
            may not be possible to undo them. Take a moment to review your edits
            and make sure they accurately reflect your intended changes. If
            you&apos;re unsure about any of the edits, you may want to consult
            with a colleague or supervisor before submitting them. Remember, the
            changes you make can have a significant impact on the content, so
            it&apos;s essential to ensure that they are correct and appropriate.
            Thank you for taking the time to review your edits before
            submitting.
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
