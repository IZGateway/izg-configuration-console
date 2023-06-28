import * as React from 'react'
import {
  Card,
  CardHeader,
  CardContent,
  Divider,
  TextField,
  Typography
} from '@mui/material'

interface jurisdictionProps {
  destinationById: {
    dest_uri: string
    dest_type: {
      type: string
    }
    jurisdiction: {
      description: string
    }
    status: {
      status: string
    }
    username: string
    facility_id: string
    MSH3: string
    MSH4: string
    MSH5: string
    MSH6: string
    MSH22: string
    RXA11: string
  }
}

const Jurisdiction = ({ destinationById }: jurisdictionProps) => {
  return (
    <>
      <Card sx={{ minWidth: 275, borderRadius: '0px 0px 30px 30px' }}>
        <CardHeader title={
          <Typography component="h2" sx={{ fontWeight: 'bold' }} variant="h6">
            Review the Jurisdiction to get started
          </Typography>
        } />
        <Divider />
        <CardContent>
          <div>
            Within this section, you can review the Jurisdiction of your
            selected connection. It's important to make sure that the
            Jurisdiction is correct, as any changes made will impact the
            selected connection.
          </div>
          <TextField
            id="jurisdiction"
            label="Jurisdiction"
            variant="filled"
            fullWidth
            disabled
            defaultValue={destinationById.jurisdiction.description}
            InputProps={{
              readOnly: true,
            }}
            sx={{ marginTop: 1 }}
          />
        </CardContent>
      </Card>
      <Card
        sx={{ minWidth: 275, marginTop: 5, borderRadius: '0px 0px 30px 30px' }}
      >
        <CardHeader title={
          <Typography component="h2" sx={{ fontWeight: 'bold' }} variant="h6">
            Review the type of connection
          </Typography>
        } />
        <Divider />
        <CardContent>
          <div>
            Within this section, you can review the type of connection you have,
            such as production or test
          </div>
          <TextField
            id="connectionType"
            label="Type Of Connection"
            variant="filled"
            fullWidth
            disabled
            defaultValue={destinationById.dest_type.type}
            InputProps={{
              readOnly: true,
            }}
            sx={{ marginTop: 1 }}
          />
        </CardContent>
      </Card>
    </>
  )
}

export default Jurisdiction
