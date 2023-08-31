import { prismacontext } from '../../prismacontext'

const jurisdiction = async (destId: string) =>
  await prismacontext.prisma.jurisdiction.findFirst({
    where: { dest_prefix: destId },
  })

export default jurisdiction
