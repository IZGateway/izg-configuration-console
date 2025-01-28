import logger from '../../../../../../logger'
import { prismacontext } from '../../../../prismacontext'
import { DestinationAudit } from '../../../../type/DestinationAudit'

const fetchDesinationAuditHistory = async (
  destId: string,
  destType: number
): Promise<DestinationAudit[]> => {
  const result = await prismacontext.prisma.audit_history.findMany({
    where: {
      tableName: 'destinations',
      dest_id: destId,
      dest_type: destType,
    },
    orderBy: { createdAt: 'desc' },
  })
  if (!result) {
    logger.debug(`Destination Audit not found: ${destId} and ${destType}`)
    return null
  }

  return result.map((audit) => ({
    id: audit.id,
    destId: audit.dest_id,
    destType: audit.dest_type,
    tableName: audit.tableName,
    changeType: audit.changeType.valueOf(),
    oldValues:
      typeof audit.oldValues === 'string'
        ? JSON.parse(audit.oldValues)
        : audit.oldValues,
    newValues:
      typeof audit.newValues === 'string'
        ? JSON.parse(audit.newValues)
        : audit.newValues,
    userName: audit.userName,
    createdAt: audit.createdAt,
  }))
}

export default fetchDesinationAuditHistory
