import logger from '../../../../../../logger'
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
      oldValues: JSON.stringify(destinationchangerequest.current),
      newValues: JSON.stringify(destinationchangerequest.requested),
      createdAt: new Date(),
    },
  })

  if (!audit) {
    logger.debug(
      `Error creating Audit history for destination ${destinationchangerequest.destId}`
    )
    return false
  }
  return true
}

export default createDestinationAudit
