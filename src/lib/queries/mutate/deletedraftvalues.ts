import { prismacontext } from '../../prismacontext'
const deleteDraftValues = async (
  id: number,
  destId: string,
  dest_type: number
) => {
  return await prismacontext.prisma.destination_change_request.delete({
    where: {
      id: id,
      dest_id: destId,
      jira_id: null,
      dest_type: dest_type,
    },
  })
}

export default deleteDraftValues
