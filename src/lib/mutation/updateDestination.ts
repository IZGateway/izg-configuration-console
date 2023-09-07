import { prismacontext } from '../prismacontext'

const updateDestination = async (
  destId: string,
  destType: number,
  data: object,
  password: string
) =>
  await prismacontext.prisma.destinations.update({
    where: { dest_id_dest_type: { dest_id: destId, dest_type: destType } },
    data: { ...data },
  })

export default updateDestination
