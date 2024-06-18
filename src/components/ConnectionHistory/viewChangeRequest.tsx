import * as React from 'react'
import {
  Box,
  Typography,
  CardHeader,
  Card,
  CardContent,
  Divider,
  Button,
} from '@mui/material'
import Link from 'next/link'

const ViewChangeRequest = (props) => {
  return (
    <div>
      <Card
        sx={{ marginTop: 4, borderRadius: '0px 0px 16px 16px' }}
        id="view-change-request"
      >
        <CardHeader title="View Change Request?" />
        <Divider />
        <CardContent>
          <Typography pt={2} pb={2} variant="body1">
            Use the button below to access the most recent change request.
          </Typography>
          <Box pt={4} textAlign="center">
            <Link
              prefetch={false}
              href={{
                pathname: `/changerequest/${props.destTypeId}/${props.destId}`,
              }}
            >
              <Button
                id="access"
                color="primary"
                variant="outlined"
                fullWidth
                sx={{
                  borderRadius: '30px',
                }}
              >
                ACCESS
              </Button>
            </Link>
          </Box>
        </CardContent>
      </Card>
    </div>
  )
}

export default ViewChangeRequest
