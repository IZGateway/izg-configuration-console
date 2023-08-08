import { prismacontext } from '../../prismacontext'

const destinationaudithistory = async (destId: string) =>
  await prismacontext.prisma.audit_history.findMany({
    where: {
      tableName: 'destinations',
      // userName: _args.user,
      oldValues: {
        path: '$.dest_id',
        equals: destId,
      },
    },
    orderBy: { createdAt: 'desc' },
  })

export default destinationaudithistory
