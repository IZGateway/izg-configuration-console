import MessagesWidget from './MessagesWidget'
import { buildInboundCombinedQuery } from './queries/inboundMessagesQuery'

interface InboundMessagesProps {
  selectedConnection?: string
}

const InboundMessages = ({ selectedConnection }: InboundMessagesProps) => {
  return (
    <MessagesWidget
      title="Inbound Messages"
      cardId="inbound-messages"
      selectedConnection={selectedConnection}
      direction="inbound"
      queryBuilder={buildInboundCombinedQuery}
    />
  )
}

export default InboundMessages
