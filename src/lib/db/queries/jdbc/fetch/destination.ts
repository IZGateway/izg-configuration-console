import logger from '../../../../../../logger'
import { prismacontext } from '../../../../prismacontext'
import { Destination } from '../../../../type/Destination'

export const fetchDestination = async (
  destId: string,
  destType: number
): Promise<Destination> => {
  const result = await prismacontext.prisma.destinations.findUnique({
    where: { dest_id_dest_type: { dest_id: destId, dest_type: destType } },
    select: {
      dest_id: true,
      dest_uri: true,
      dest_version: true,
      username: true,
      MSH6: true,
      MSH22: true,
      MSH3: true,
      MSH4: true,
      MSH5: true,
      RXA11: true,
      facility_id: true,
      pass_expiry: true,
      maint_reason: true,
      maint_start: true,
      maint_end: true,
      destination_type: {
        select: {
          type: true,
          type_id: true,
        },
      },
      jurisdiction: {
        select: {
          jurisdiction_id: true,
          name: true,
          description: true,
        },
      },
    },
  })
  if (!result) {
    logger.debug(`Destination not found: ${destId} and ${destType}`)
    return null
  }
  return {
    destId: result.dest_id,
    destUri: result.dest_uri,
    destVersion: result.dest_version,
    username: result.username,
    MSH6: result.MSH6,
    MSH22: result.MSH22,
    MSH3: result.MSH3,
    MSH4: result.MSH4,
    MSH5: result.MSH5,
    RXA11: result.RXA11,
    facilityId: result.facility_id,
    passExpiry: result.pass_expiry,
    maintReason: result.maint_reason,
    maintStart: result.maint_start,
    maintEnd: result.maint_end,
    destinationType: {
      type: result.destination_type.type,
      typeId: result.destination_type.type_id,
    },
    jurisdiction: {
      jurisdictionId: result.jurisdiction.jurisdiction_id,
      name: result.jurisdiction.name,
      description: result.jurisdiction.description,
    },
  }
}

export const fetchDestinationPassword = async (
  destId: string,
  destType: number
): Promise<string> => {
  const result = await prismacontext.prisma
    .$queryRaw`SELECT password FROM destinations where dest_id=${destId} and dest_type=${destType}`
  return result[0].password
}
