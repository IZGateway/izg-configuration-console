import { prismacontext } from '../../prismacontext'

const destinationaudithistory = async (destId: string, destTypeId: number) =>
  await prismacontext.prisma.audit_history.findMany({
    where: {
      tableName: 'destinations',
      AND: [
        {
          newValues: {
            path: '$.dest_id',
            equals: destId,
          },
        },
        {
          newValues: {
            path: '$.dest_type',
            equals: destTypeId,
          },
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
  })

export default destinationaudithistory
