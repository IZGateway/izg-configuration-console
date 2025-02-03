import { prismacontext } from '../../../../prismacontext'
import { DestinationChangeRequest } from '../../../../type/DestinationChangeRequest'
import logger from '../../../../../../logger'

const upsertDestinationChangeRequest = async (
  changeRequestData: DestinationChangeRequest
): Promise<DestinationChangeRequest> => {
  const results = await prismacontext.prisma.destination_change_request.upsert({
    where: {
      id: changeRequestData.id || 0,
      dest_type: changeRequestData.destType.typeId,
      dest_id: changeRequestData.destId,
    },
    create: {
      jira_id: changeRequestData.jiraId,
      scheduledAt: changeRequestData.scheduledAt,
      requestedAt: changeRequestData.requestedAt || new Date(),
      requestedBy: changeRequestData.requestedBy,
      dest_id: changeRequestData.destId,
      dest_uri: changeRequestData.requested.destUri,
      dest_type: changeRequestData.destType.typeId,
      username: changeRequestData.requested.username,
      password: changeRequestData.requested.password,
      facility_id: changeRequestData.requested.facilityId,
      MSH3: changeRequestData.requested.MSH3,
      MSH4: changeRequestData.requested.MSH4,
      MSH5: changeRequestData.requested.MSH5,
      MSH6: changeRequestData.requested.MSH6,
      MSH22: changeRequestData.requested.MSH22,
      RXA11: changeRequestData.requested.RXA11,
    },
    update: {
      jira_id: changeRequestData.jiraId,
      scheduledAt: changeRequestData.scheduledAt,
      requestedAt: changeRequestData.requestedAt || new Date(),
      requestedBy: changeRequestData.requestedBy,
      dest_id: changeRequestData.destId,
      dest_uri: changeRequestData.requested.destUri,
      dest_type: changeRequestData.destType.typeId,
      username: changeRequestData.requested.username,
      password: changeRequestData.requested.password,
      facility_id: changeRequestData.requested.facilityId,
      MSH3: changeRequestData.requested.MSH3,
      MSH4: changeRequestData.requested.MSH4,
      MSH5: changeRequestData.requested.MSH5,
      MSH6: changeRequestData.requested.MSH6,
      MSH22: changeRequestData.requested.MSH22,
      RXA11: changeRequestData.requested.RXA11,
    },
  })
  if (!results) {
    logger.debug(
      `Destination Change Request not processed: ${changeRequestData.destId} and ${changeRequestData.destType.typeId}`
    )
    return null
  }
  return {
    id: results.id,
    jiraId: results.jira_id,
    destId: results.dest_id,
    isDraft: false,
    scheduledAt: results.scheduledAt,
    requestedBy: results.requestedBy,
    requestedAt: results.requestedAt,
    destType: {
      typeId: results.dest_type,
      type: null,
    },
    requested: {
      destUri: results.dest_uri,
      username: results.username,
      facilityId: results.facility_id,
      MSH3: results.MSH3,
      MSH4: results.MSH4,
      MSH5: results.MSH5,
      MSH6: results.MSH6,
      MSH22: results.MSH22,
      RXA11: results.RXA11,
    },
  }
}

const deleteChangeRequest = async (id: number) => {
  const results = await prismacontext.prisma.destination_change_request.delete({
    where: {
      id: id,
    },
  })
  if (results) {
    return true
  }
  return false
}

export { upsertDestinationChangeRequest, deleteChangeRequest }
