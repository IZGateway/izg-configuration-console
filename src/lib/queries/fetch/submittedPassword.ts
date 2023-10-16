import { prismacontext } from '../../prismacontext'

const submittedPassword = async (destId: string, destType: number) =>
  await prismacontext.prisma.destination_change_request.findFirst({
    where: { dest_id: destId, dest_type: destType },
    select: {
      password: true,
    },
  })

export default submittedPassword
