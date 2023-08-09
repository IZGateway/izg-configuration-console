import { prismacontext } from '../prismacontext'

const updateDestination = async (
  destId: string,
  data: object,
  password: string
) =>
  await prismacontext.prisma.destinations.update({
    where: { dest_id: destId },
    data: { ...data },
  })

export default updateDestination
