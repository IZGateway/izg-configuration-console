import { prismacontext } from '../../prismacontext'

const jurisdiction = async (destId: string) =>
  await prismacontext.prisma.jurisdiction.findFirst({
    where: { dest_id: destId },
  })

export default jurisdiction
