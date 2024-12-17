import logger from '../../../../../../logger'
import { prismacontext } from '../../../../prismacontext'
import { DestinationChangeRequest } from '../../../../type/DestinationChangeRequest'

const fetchDestinationChangeRequest = async (
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
    destUri: result.dest_uri,
    destType: result.dest_type,
    jiraId: result.jira_id,
    MSH22: result.MSH22,
    MSH3: result.MSH3,
    MSH4: result.MSH4,
    MSH5: result.MSH5,
    MSH6: result.MSH6,
    requestedAt: result.requestedAt,
    requestedBy: result.requestedBy,
    RXA11: result.RXA11,
    scheduledAt: result.scheduledAt,
    username: result.username,
    facilityId: result.facility_id,
    destinations: {
      destinationType: {
        type: result.destinations.destination_type.type,
        typeId: result.destinations.destination_type.type_id,
      },
      jurisdiction: {
        name: result.destinations.jurisdiction.name,
        description: result.destinations.jurisdiction.description,
      },
    },
  }
}

export const fetchDestinationChangeRequestByIdAndType = async (
  destId: string,
  destType: number
) => {
  const destinationChangeRequest = await fetchDestinationChangeRequest(
    destId,
    destType
  )
  return destinationChangeRequest
}

export const fetchChangeRequestPasswordByIdAndType = async (
  destId: string,
  destType: number
): Promise<string> => {
  const data = await prismacontext.prisma.$queryRaw<
    { password: string }[]
  >`SELECT password FROM destinations where dest_id=${destId} and dest_type=${destType}`
  return data[0].password
}
