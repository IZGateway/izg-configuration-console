import { dbClient } from './dbclient'

export async function lookupDestinationVersion(destination, destId, destType) {
  if (!destination.dest_version) {
    destination = dbClient.destination(destId, destType)
  }
  if (!destination.dest_version) {
    return '2014'
  }
  return destination.dest_version
}
