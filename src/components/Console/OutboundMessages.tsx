import MessagesWidget from './MessagesWidget'
import { buildOutboundCombinedQuery } from './queries/outboundMessagesQuery'

interface OutboundMessagesProps {
  selectedConnection?: string
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
