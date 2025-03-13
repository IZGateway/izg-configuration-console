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

const MakeChanges = (props: DestinationChangeRequest) => {
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
        </Box>
        <RescheduleDialog
          open={openReschedule}
          handleClose={closeRescheduleDialog}
          changeRequest={props}
        />

        <CancelRequestDialog
          open={openCancelRequest}
          handleClose={closeCancelRequestDialog}
          changeRequestId={props.id}
        />
      </CardContent>
    </Card>
  )
}

export default MakeChanges
