import { prismacontext } from '../../prismacontext'

const endpointstatus = async (destId: string, maxResults) =>
  await prismacontext.prisma.endpointstatus.findMany({
    take: maxResults,
    where: { dest_id: destId },
    orderBy: { ran_at: 'desc' },
  })

export default endpointstatus
