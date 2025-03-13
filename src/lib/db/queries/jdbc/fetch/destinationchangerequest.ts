import logger from '../../../../../../logger'
import { prismacontext } from '../../../../prismacontext'
import { DestinationChangeRequest } from '../../../../type/DestinationChangeRequest'
import { fetchDestination } from './destination'
import passwordComparison from './passwordComparison'

export const fetchDestinationChangeRequestByDestIdAndDestType = async (
  destId: string,
  destType: number
): Promise<DestinationChangeRequest> => {
  const result =
    await prismacontext.prisma.destination_change_request.findFirst({
      where: { dest_id: destId, dest_type: destType },
      select: {
        id: true,
        dest_id: true,
        dest_uri: true,
        dest_type: true,
        jira_id: true,
        MSH22: true,
        MSH3: true,
        MSH4: true,
        MSH5: true,
        MSH6: true,
        requestedAt: true,
        requestedBy: true,
        RXA11: true,
        scheduledAt: true,
        username: true,
        facility_id: true,
        destinations: {
          select: {
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
        },
      },
    })
  if (!result) {
    logger.debug(
      `Destination Change Request not found: ${destId} and ${destType}`
    )
    return null
  }
  return {
    id: result.id,
    destId: result.dest_id,
    destType: {
      type: result.destinations.destination_type.type,
      typeId: result.destinations.destination_type.type_id,
    },
    jurisdiction: {
      jurisdictionId: result.destinations.jurisdiction.jurisdiction_id,
      name: result.destinations.jurisdiction.name,
      description: result.destinations.jurisdiction.description,
    },
    jiraId: result.jira_id,
    isDraft: result.jira_id ? false : true,
    requestedAt: result.requestedAt,
    requestedBy: result.requestedBy,
    scheduledAt: result.scheduledAt,
    requested: {
      destUri: result.dest_uri,
      username: result.username,
      MSH6: result.MSH6,
      MSH22: result.MSH22,
      MSH3: result.MSH3,
      MSH4: result.MSH4,
      MSH5: result.MSH5,
      RXA11: result.RXA11,
      facilityId: result.facility_id,
    },
    current: await getCurrentDestinationSettings(
      result.dest_id,
      result.dest_type
    ),
    isPasswordDifferent: await getPasswordComparison(
      result.dest_id,
      result.dest_type
    ),
  }
}

export const fetchDestinationChangeRequestById = async (
  id: number
): Promise<DestinationChangeRequest> => {
  const result =
    await prismacontext.prisma.destination_change_request.findUnique({
      where: { id: id },
      select: {
        id: true,
        dest_id: true,
        dest_uri: true,
        dest_type: true,
        jira_id: true,
        MSH22: true,
        MSH3: true,
        MSH4: true,
        MSH5: true,
        MSH6: true,
        requestedAt: true,
        requestedBy: true,
        RXA11: true,
        scheduledAt: true,
        username: true,
        facility_id: true,
        destinations: {
          select: {
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
        },
      },
    })
  if (!result) {
    logger.debug(`Destination Change Request not found`)
    return null
  }
  return {
    id: result.id,
    destId: result.dest_id,
    destType: {
      type: result.destinations.destination_type.type,
      typeId: result.destinations.destination_type.type_id,
    },
    jurisdiction: {
      jurisdictionId: result.destinations.jurisdiction.jurisdiction_id,
      name: result.destinations.jurisdiction.name,
      description: result.destinations.jurisdiction.description,
    },
    jiraId: result.jira_id,
    isDraft: result.jira_id ? false : true,
    requestedAt: result.requestedAt,
    requestedBy: result.requestedBy,
    scheduledAt: result.scheduledAt,
    requested: {
      destUri: result.dest_uri,
      username: result.username,
      MSH6: result.MSH6,
      MSH22: result.MSH22,
      MSH3: result.MSH3,
      MSH4: result.MSH4,
      MSH5: result.MSH5,
      RXA11: result.RXA11,
      facilityId: result.facility_id,
    },
    current: await getCurrentDestinationSettings(
      result.dest_id,
      result.dest_type
    ),
    isPasswordDifferent: await getPasswordComparison(
      result.dest_id,
      result.dest_type
    ),
  }
}

export const fetchChangeRequestPassword = async (
  id: number
): Promise<string> => {
  const data = await prismacontext.prisma.$queryRaw<
    { password: string }[]
  >`SELECT password FROM destination_change_request where id=${id}`
  return data[0].password
}

const getCurrentDestinationSettings = async (
  destId: string,
  destType: number
) => {
  const result = await fetchDestination(destId, destType)
  if (result) {
    return {
      destUri: result.destUri,
      username: result.username,
      MSH6: result.MSH6,
      MSH22: result.MSH22,
      MSH3: result.MSH3,
      MSH4: result.MSH4,
      MSH5: result.MSH5,
      RXA11: result.RXA11,
      facilityId: result.facilityId,
    }
  }
  return null
}

const getPasswordComparison = async (destId: string, destType: number) => {
  const result = await passwordComparison(destId, destType)
  return result
}
