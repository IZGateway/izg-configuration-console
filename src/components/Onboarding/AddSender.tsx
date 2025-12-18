import React from 'react'
import EditSender from './EditSender'
import { type SenderData } from './SenderData'

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
    destinationType: 0, // Will be set by user via dropdown
    accessLevel: 'Full Access',
    status: 'validate',
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
