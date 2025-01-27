import { prismacontext } from '../../../../prismacontext'
import { DestinationChangeRequest } from '../../../../type/DestinationChangeRequest'

const createDestinationAudit = async (
  destinationchangerequest: DestinationChangeRequest,
  user: string
) => {
  const audit = await prismacontext.prisma.audit_history.create({
    data: {
      tableName: 'destinations',
      dest_id: destinationchangerequest.destId,
      dest_type: destinationchangerequest.destType.typeId,
      userName: user,
      changeType: 'Update',
      oldValues: destinationchangerequest.current,
      newValues: destinationchangerequest.requested,
      createdAt: new Date(),
    },
  })

  if (audit) {
    return true
  }
  return false
}

export default createDestinationAudit
