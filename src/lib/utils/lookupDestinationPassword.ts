import { dbClient } from './dbclient'

export async function lookupDestinationPassword(
  destId: string,
  destTypeId: number
) {
  const password = await dbClient.fetchDestinationPassword(destId, destTypeId)
  return password
}
