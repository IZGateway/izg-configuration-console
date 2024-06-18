import { prismacontext } from '../../prismacontext'

const maintenanceRequest = async (
  destId: string,
  destType: number,
  maintData
) => {
  return await prismacontext.prisma.destinations.update({
    where: { dest_id_dest_type: { dest_id: destId, dest_type: destType } },
    data: {
      maint_reason: maintData.message,
      maint_start: maintData.startDateTime,
      maint_end: maintData.reinstatementDateTime,
    },
  })
}

export default maintenanceRequest
