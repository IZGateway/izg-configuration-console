import { prismacontext } from '../../../../prismacontext'

const deleteChangeRequest = async (destId: string, destType: number) => {
  const results =
    await prismacontext.prisma.destination_change_request.deleteMany({
      where: {
        //id: id[0].id,
        dest_id: destId,
        dest_type: destType,
      },
    })
  if (results.count > 0) {
    return true
  }
  return false
}

export default deleteChangeRequest
