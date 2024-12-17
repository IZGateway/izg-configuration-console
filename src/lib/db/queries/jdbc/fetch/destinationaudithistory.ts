import { prismacontext } from '../../../../prismacontext'

const destinationaudithistory = async (destId: string, destTypeId: number) =>
  await prismacontext.prisma.audit_history.findMany({
    where: {
      tableName: 'destinations',
      dest_id: destId,
      dest_type: destTypeId,
    },
    orderBy: { createdAt: 'desc' },
  })

export default destinationaudithistory
