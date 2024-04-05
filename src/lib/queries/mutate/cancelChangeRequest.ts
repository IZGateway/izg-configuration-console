import { prismacontext } from '../../prismacontext'

const cancelChangeRequest = async (destId: string, destType: number) => {
  const id = await prismacontext.prisma
    .$queryRaw`SELECT id FROM destination_change_request where dest_id=${destId} and dest_type=${destType}`
  return await prismacontext.prisma.destination_change_request.delete({
    where: {
      id: id[0].id,
      dest_id: destId,
      dest_type: destType,
    },
  })
}

export default cancelChangeRequest
