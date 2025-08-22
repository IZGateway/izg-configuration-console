import _ from 'lodash'
import DbClientFactory from '../db/DbClientFactory'
export async function lookupDestinationVersion(
  destId: string,
  destTypeId: number
) {
  const dbClient = await DbClientFactory.getDbClient()
  const destination = await dbClient.fetchDestination(destId, destTypeId)
  if (_.isEmpty(destination.destVersion)) {
    return '2014'
  }
  return destination.destVersion
}
