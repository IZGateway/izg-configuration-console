import MessagesWidget from './MessagesWidget'
import { buildOutboundCombinedQuery } from './queries/outboundMessagesQuery'
import { Organization } from './MessagesWidget'

interface OutboundMessagesProps {
  selectedConnection?: string
  organizations?: Organization[]
  organizationsLoading?: boolean
}

const OutboundMessages = ({ selectedConnection }: OutboundMessagesProps) => {
  return (
    <MessagesWidget
      title="Outbound Messages"
      cardId="outbound-messages"
      selectedConnection={selectedConnection}
      direction="outbound"
      queryBuilder={buildOutboundCombinedQuery}
    />
  )
}
export default OutboundMessages
