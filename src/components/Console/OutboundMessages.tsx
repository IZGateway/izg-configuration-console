import { Card, CardContent, CardHeader, Divider } from '@mui/material'

const OutboundMessages = (props) => {
  return (
    <div>
      <Card
        sx={{ marginTop: 4, borderRadius: '0px 0px 16px 16px' }}
        id="outbound-messages"
      >
        <CardHeader
          sx={{
            '&& .MuiCardHeader-content': {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            },
          }}
          title="Outbound messages"
        ></CardHeader>
        <Divider />
        <CardContent></CardContent>
      </Card>
    </div>
  )
}
export default OutboundMessages
