import * as React from 'react'
import {
  Typography,
  CardHeader,
  Card,
  CardContent,
  Divider,
  Button,
  Box,
} from '@mui/material'
import RescheduleDialog from './reScheduleDialog'
import { useState } from 'react'
import CancelRequestDialog from './cancelRequestDialog'
import { DestinationChangeRequest } from '../../lib/type/DestinationChangeRequest'

/**
 * Reschedule and Cancel are separate capabilities and separate rows in the
 * target matrix, so they are gated separately here. Until IGDD-3472 both
 * buttons rendered on `canRescheduleRequest` alone and neither API route
 * checked a capability at all, so the conflation was invisible. Now that
 * `DELETE /api/changerequest` enforces `canCancelRequest`, a role granted one
 * flag without the other would see a button that answers 403.
 */
type MakeChangesProps = DestinationChangeRequest & {
  canRescheduleRequest: boolean
  canCancelRequest: boolean
}

const MakeChanges = ({
  canRescheduleRequest,
  canCancelRequest,
  ...props
}: MakeChangesProps) => {
  const [openReschedule, setOpenReschedule] = useState(false)
  const [openCancelRequest, setOpenCancelRequest] = useState(false)
  const openRescheduleDialog = () => {
    setOpenReschedule(true)
  }
  const closeRescheduleDialog = () => {
    setOpenReschedule(false)
  }
  const openCancelRequestDialog = () => {
    setOpenCancelRequest(true)
  }
  const closeCancelRequestDialog = () => {
    setOpenCancelRequest(false)
  }
  return (
    <Card
      sx={{ marginTop: 4, borderRadius: '0px 0px 16px 16px' }}
      id="reschedule"
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginRight: 4,
        }}
      >
        <CardHeader title="Need to make changes?" />
      </Box>
      <Divider />
      <CardContent>
        <Typography variant="body1" component="div">
          You can only reschedule or cancel your change request once it has
          already been scheduled. Please note that this is a significant change,
          and we want to ensure that you are certain about taking this action.
        </Typography>
        <Box display={'flex'} flexDirection={'row'} gap={2} mt={4}>
          {canRescheduleRequest && (
            <Button
              id="reschedule"
              color="primary"
              variant="outlined"
              fullWidth
              onClick={openRescheduleDialog}
              sx={{
                borderRadius: '30px',
              }}
            >
              Reschedule
            </Button>
          )}
          {canCancelRequest && (
            <Button
              id="cancel"
              color="error"
              variant="outlined"
              fullWidth
              onClick={openCancelRequestDialog}
              sx={{
                borderRadius: '30px',
              }}
            >
              CANCEL REQUEST
            </Button>
          )}
        </Box>
        {canRescheduleRequest && (
          <RescheduleDialog
            open={openReschedule}
            handleClose={closeRescheduleDialog}
            changeRequest={props}
          />
        )}

        {canCancelRequest && (
          <CancelRequestDialog
            open={openCancelRequest}
            handleClose={closeCancelRequestDialog}
            changeRequestId={props.id}
          />
        )}
      </CardContent>
    </Card>
  )
}

export default MakeChanges
