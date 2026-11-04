import {
  elasticClient,
  getConsoleElasticIndex,
} from '../repositories/ElasticRepository'
import { buildSystemResourcesQuery } from './queries/systemResourcesQuery'

/**
 * The status report is hub-wide and identical for every caller, and the Home
 * widget polls it every minute for every signed-in user. Serving one result
 * per window, and sharing a query already in flight, keeps Elasticsearch load
 * per server task fixed no matter how many users have Home open.
 */
export const SYSTEM_RESOURCES_CACHE_TTL_MS = 30_000

type SystemResourcesResult = Awaited<ReturnType<typeof elasticClient.query>>

let cached: { data: SystemResourcesResult; expiresAt: number } | undefined
let inFlight: Promise<SystemResourcesResult> | undefined

export async function fetchSystemResources(
  userEmail?: string,
  now: () => number = Date.now
): Promise<SystemResourcesResult> {
  if (cached && cached.expiresAt > now()) return cached.data
  if (!inFlight) {
    inFlight = elasticClient
      .query(getConsoleElasticIndex(), buildSystemResourcesQuery(), userEmail)
      .then((data) => {
        cached = { data, expiresAt: now() + SYSTEM_RESOURCES_CACHE_TTL_MS }
        return data
      })
      // Failures are not cached: the next request retries.
      .finally(() => {
        inFlight = undefined
      })
  }
  return inFlight
}

/** Test seam: drop the cached result between cases. */
export function resetSystemResourcesCache(): void {
  cached = undefined
  inFlight = undefined
}
