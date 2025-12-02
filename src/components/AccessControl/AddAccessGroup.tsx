import React from 'react'
import EditAccessGroup from './EditAccessGroup'
import { type AccessGroup } from './AccessGroups'

interface AddAccessGroupProps {
  onSave: (newGroup: AccessGroup) => void
  onCancel: () => void
  availableMembers?: string[]
  isLoadingMembers?: boolean
}

const AddAccessGroup: React.FC<AddAccessGroupProps> = ({
  onSave,
  onCancel,
  availableMembers,
  isLoadingMembers,
}) => {
  // Create a new empty access group object with default values
  const newGroupData: AccessGroup = {
    id: '',
    groupName: '',
    description: '',
    memberCount: 0,
    roles: [],
    members: [],
    environment: '5',
  }

  return (
    <EditAccessGroup
      group={newGroupData}
      onSave={onSave}
      onCancel={onCancel}
      availableMembers={availableMembers}
      isLoadingMembers={isLoadingMembers}
    />
  )
}

export default AddAccessGroup
