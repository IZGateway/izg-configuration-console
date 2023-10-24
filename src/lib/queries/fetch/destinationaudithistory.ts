import { prismacontext } from '../../prismacontext'

const destinationaudithistory = async (
  destId: string,
  destTypeId: number,
  user: string
) =>
  await prismacontext.prisma.audit_history.findMany({
    where: {
      tableName: 'destinations',
      userName: user,
      AND: [
        {
          newValues: {
            contains: `\"dest_type\":${destTypeId}`,
          },
        },
        {
          newValues: {
            contains: `\"dest_id\":\"${destId}\"`,
          },
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
  })

export default destinationaudithistory
