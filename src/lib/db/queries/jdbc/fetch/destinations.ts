import logger from '../../../../../../logger'
import { prismacontext } from '../../../../prismacontext'
import { Destination } from '../../../../type/Destination'

const fetchDestinations = async (
  isAdmin: boolean,
  jurisdictions: Array<string>
): Promise<Destination[]> => {
  const result = await prismacontext.prisma.destinations.findMany({
    where: !isAdmin
      ? {
          dest_id: {
            in: jurisdictions,
          },
        }
      : {},
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
          name: true,
          description: true,
        },
      },
    },
  })
  if (!result) {
    logger.error(`Error fetching destinations`)
    return null
  }
  return result.map((dest) => ({
    destId: dest.dest_id,
    destUri: dest.dest_uri,
    username: dest.username,
    facilityId: dest.facility_id,
    MSH3: dest.MSH3,
    MSH4: dest.MSH4,
    MSH5: dest.MSH5,
    MSH6: dest.MSH6,
    MSH22: dest.MSH22,
    RXA11: dest.RXA11,
    destTypeId: dest.destination_type.type_id,
    destVersion: dest.dest_version,
    passExpiry: dest.pass_expiry,
    maintReason: dest.maint_reason,
    maintStart: dest.maint_start,
    maintEnd: dest.maint_end,
    destinationType: {
      type: dest.destination_type.type,
      typeId: dest.destination_type.type_id,
    },
    jurisdiction: {
      name: dest.jurisdiction.name,
      description: dest.jurisdiction.description,
    },
  }))
}

const fetchLoggedInUsersDestinations = async (
  isAdmin: boolean,
  jurisdictions: Array<string>
) => {
  const destinations = await fetchDestinations(isAdmin, jurisdictions)
  return destinations
}

export default fetchLoggedInUsersDestinations
