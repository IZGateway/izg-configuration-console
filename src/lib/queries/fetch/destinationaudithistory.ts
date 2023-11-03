import { prismacontext } from '../../prismacontext'

const destinationaudithistory = async (
  destId: string,
  destTypeId: string,
  user: string
) =>
  await prismacontext.prisma.audit_history.findMany({
    where: {
      tableName: 'destinations',
      userName: user,
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
