import logger from '../../../../../../logger'
import { prismacontext } from '../../../../prismacontext'
import { DestinationChangeRequest } from '../../../../type/DestinationChangeRequest'
import { fetchDestination } from './destination'
import passwordComparison from './passwordComparison'

const fetchDraftRecord = async (
  destId: string,
  destType: number
): Promise<DestinationChangeRequest> => {
  const result =
    await prismacontext.prisma.destination_change_request.findFirst({
      where: { dest_id: destId, dest_type: destType, jira_id: null },
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
    //destUri: result.dest_uri,
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
    requestedAt: result.requestedAt,
    requestedBy: result.requestedBy,
    scheduledAt: result.scheduledAt,
    isDraft: result.jira_id ? false : true,
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

export default fetchDraftRecord

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
