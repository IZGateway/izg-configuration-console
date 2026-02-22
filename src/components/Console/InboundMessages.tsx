import MessagesWidget, { Organization } from './MessagesWidget'
import { buildInboundCombinedQuery } from './queries/inboundMessagesQuery'

interface InboundMessagesProps {
  selectedConnection?: string
  organizations?: Organization[]
  organizationsLoading?: boolean
}

const InboundMessages = ({
  selectedConnection,
  organizations,
  organizationsLoading,
}: InboundMessagesProps) => {
  return (
    <MessagesWidget
      title="Inbound Messages"
      cardId="inbound-messages"
      selectedConnection={selectedConnection}
      organizations={organizations}
      organizationsLoading={organizationsLoading}
      queryBuilder={buildInboundCombinedQuery}
    />
  )
}

export default InboundMessages
