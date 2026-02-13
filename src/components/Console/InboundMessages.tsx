import { Card, CardContent, CardHeader, Divider } from '@mui/material'

const InboundMessages = (props) => {
  return (
    <div>
      <Card
        sx={{
          marginTop: 4,
          borderRadius: '0px 0px 16px 16px',
          boxShadow: 'none',
          border: '1px solid #E0E0E0',
        }}
        id="inbound-messages"
      >
        <CardHeader
          sx={{
            '&& .MuiCardHeader-content': {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            },
          }}
          title="Inbound messages"
        ></CardHeader>
        <Divider />
        <CardContent></CardContent>
      </Card>
    </div>
  )
}
export default InboundMessages
