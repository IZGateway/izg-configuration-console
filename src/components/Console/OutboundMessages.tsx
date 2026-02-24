import { Card, CardContent, CardHeader, Divider } from '@mui/material'
import type { Organization } from './MessagesWidget'

interface OutboundMessagesProps {
  organizations?: Organization[]
  organizationsLoading?: boolean
}

// TODO: Wire to MessagesWidget with outbound query builder when available
const OutboundMessages = (_props: OutboundMessagesProps) => {
  return (
    <div>
      <Card
        sx={{
          marginTop: 4,
          borderRadius: '0px 0px 16px 16px',
          boxShadow: 'none',
          border: '1px solid #E0E0E0',
        }}
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
