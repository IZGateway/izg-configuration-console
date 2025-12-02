import React from 'react'
import EditAccessGroup from './EditAccessGroup'
import { type AccessGroup } from './mockData'

interface AddAccessGroupProps {
  onSave: (newGroup: AccessGroup) => void
  onCancel: () => void
}

const AddAccessGroup: React.FC<AddAccessGroupProps> = ({
  onSave,
  onCancel,
}) => {
  // Create a new empty access group object with default values
  const newGroupData: AccessGroup = {
    id: '',
    groupName: '',
    description: '',
    memberCount: 0,
    roles: [],
    members: [],
  }

  return (
    <EditAccessGroup group={newGroupData} onSave={onSave} onCancel={onCancel} />
  )
}

export default AddAccessGroup
