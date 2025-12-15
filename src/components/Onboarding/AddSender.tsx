import React from 'react'
import EditSender from './EditSender'
import { type SenderData } from './mockData'

interface AddSenderProps {
  onSave: (newSender: SenderData) => void
  onCancel: () => void
  validateDuplicate?: (candidate: SenderData) => boolean
}

const AddSender: React.FC<AddSenderProps> = ({
  onSave,
  onCancel,
  validateDuplicate,
}) => {
  // Create a new empty sender object with default values
  const newSenderData: SenderData = {
    id: '',
    sender: '',
    senderDetails: '',
    destination: '',
    destinationCode: '',
    accessLevel: 'Full Access',
    status: 'Testing Ready',
    lastUpdated: '',
    connectionType: 'onboarding',
    isConnected: false,
    msh3: '',
    msh4: '',
    facilityId: '',
  }

  return (
    <EditSender
      senderData={newSenderData}
      onSave={onSave}
      onCancel={onCancel}
      isAddMode={true}
      validateDuplicate={validateDuplicate}
    />
  )
}

export default AddSender
