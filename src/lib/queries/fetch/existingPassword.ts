import { prismacontext } from '../../prismacontext'

const currentPassword = async (destId: string, destType: number) =>
  await prismacontext.prisma.destinations.findUnique({
    where: { dest_id_dest_type: { dest_id: destId, dest_type: destType } },
    select: {
      password: true,
    },
  })

export default currentPassword
