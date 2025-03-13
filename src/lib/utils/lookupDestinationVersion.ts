import _ from 'lodash'
import { dbClient } from './dbclient'

export async function lookupDestinationVersion(
  destId: string,
  destTypeId: number
) {
  const destination = await dbClient.fetchDestination(destId, destTypeId)
  if (_.isEmpty(destination.destVersion)) {
    return '2014'
  }
  return destination.destVersion
}
