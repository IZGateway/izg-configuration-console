import logger from '../../../../../../logger'
import { prismacontext } from '../../../../prismacontext'
import { Destination } from '../../../../type/Destination'

const updateDestination = async (destination: Destination) => {
  const result = await prismacontext.prisma.destinations.update({
    where: {
      dest_id_dest_type: {
        dest_id: destination.destId,
        dest_type: destination.destinationType.typeId,
      },
    },
    data: {
      username: destination.username,
      password: destination.password,
      facility_id: destination.facilityId,
      MSH3: destination.MSH3,
      MSH4: destination.MSH4,
      MSH5: destination.MSH5,
      MSH6: destination.MSH6,
      MSH22: destination.MSH22,
      RXA11: destination.RXA11,
      maint_reason: destination.maintReason,
      maint_start: destination.maintStart,
      maint_end: destination.maintEnd,
    },
  })
  if (!result) {
    logger.debug(`Destination not updated: ${destination.destId}`)
    return false
  }
  return true
}
export default updateDestination
