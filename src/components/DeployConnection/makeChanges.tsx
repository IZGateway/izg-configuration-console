import * as React from 'react'
import {
  Typography,
  CardHeader,
  Card,
  CardContent,
  Divider,
  Button,
  Box,
  Container,
} from '@mui/material'
import RescheduleDialog from './reScheduleDialog'
import { useState } from 'react'
import CancelRequestDialog from './cancelRequestDialog'

const MakeChanges = (props: any) => {
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
          As a user, you can only reschedule or cancel your change request once
          it has already been scheduled. Please note that this is a significant
          change, and we want to ensure that you are certain about taking this
          action.
        </Typography>
        <Container
          sx={{
            marginTop: 4,
            display: 'flex',
          }}
        >
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
        </Container>
        <RescheduleDialog
          open={openReschedule}
          handleClose={closeRescheduleDialog}
          destId={props.destId}
          destTypeId={props.destTypeId}
        />

        <CancelRequestDialog
          open={openCancelRequest}
          handleClose={closeCancelRequestDialog}
          destId={props.destId}
          destTypeId={props.destTypeId}
        />
      </CardContent>
    </Card>
  )
}

export default MakeChanges
