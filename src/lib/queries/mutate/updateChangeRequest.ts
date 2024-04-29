import { prismacontext } from '../../prismacontext'

const updateChangeRequest = async (
  destId: string,
  destType: number,
  updatedData
) => {
  const id = await prismacontext.prisma
    .$queryRaw`SELECT id FROM destination_change_request where dest_id=${destId} and dest_type=${destType}`
  return await prismacontext.prisma.destination_change_request.update({
    where: {
      id: id[0].id,
      dest_id: destId,
      dest_type: destType,
    },
    data: {
      scheduledAt: updatedData.scheduledAt,
      requestedAt: updatedData.requestedAt,
    },
  })
}

export default updateChangeRequest
