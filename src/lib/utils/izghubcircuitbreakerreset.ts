import axios from 'axios'
import * as fs from 'fs'
import path from 'path'
import https from 'https'
import IZGHubStatusHistoryEndpoint from '../IZGHubStatusHistoryEndpoint'
import logger from '../../../logger'
import { getDestinationType } from '../desttypehelper'
import { toEcsUrl } from './ecsUrl'
import type { HubRegionStatuses } from './hubregionstatus'

/**
 * Hub circuit-breaker reset REST path, relative to the hub's `/rest/` base.
 *
 * Per the IGDD-2812 design (Hub Backend Changes), reset-all is `POST
 * [hubHost]/rest/reset`. Overridable via env for non-standard deployments.
 */
const CIRCUIT_BREAKER_RESET_PATH =
  process.env.IZG_CIRCUIT_BREAKER_RESET_PATH || 'reset'

const getHttpsAgentOptions = () => {
  const IZG_ENDPOINT_CRT_PATH = process.env.IZG_ENDPOINT_CRT_PATH || undefined
  const IZG_ENDPOINT_KEY_PATH = process.env.IZG_ENDPOINT_KEY_PATH || undefined
  const IZG_ENDPOINT_PASSCODE = process.env.IZG_ENDPOINT_PASSCODE || undefined
  return {
    cert: fs.readFileSync(path.resolve(IZG_ENDPOINT_CRT_PATH), 'utf-8'),
    key: fs.readFileSync(path.resolve(IZG_ENDPOINT_KEY_PATH), 'utf-8'),
    passphrase: IZG_ENDPOINT_PASSCODE,
    rejectUnauthorized: false,
    keepAlive: true,
  }
}

// Derive `[hubHost]/rest/` from a configured status-history URL such as
// `https://dev.izgateway.org:443/rest/statushistory`.
const deriveHubRestBaseUrl = (statusHistoryUrl: string) =>
  statusHistoryUrl.substring(0, statusHistoryUrl.indexOf('/rest/') + 6)

const getConfiguredHubURLs = () =>
  new IZGHubStatusHistoryEndpoint(process.env.IZG_STATUS_ENDPOINT_URL || '')

const resetCircuitBreakersForBaseUrls = async (
  baseUrls: string[],
  metadata?: { destinationTypeId?: number; destinationType?: string }
): Promise<CircuitBreakerResetResult> => {
  const httpsAgent = new https.Agent(getHttpsAgentOptions())
  const singleHub = baseUrls.length === 1

  const outcomes = await Promise.allSettled(
    baseUrls.map((baseUrl) => {
      const url = `${baseUrl}${CIRCUIT_BREAKER_RESET_PATH}`
      logger.info('Signaling hub to reset all circuit breakers', {
        url: toEcsUrl(url),
        operation: 'reset_circuit_breakers',
        ...metadata,
      })
      // IGDD-3599: the hub fans the reset out to every instance over SQS and
      // waits up to 15s for the replies. That wait is hardcoded hub-side, so
      // this value must stay above it.
      //
      // 30s, not 20s. A reset against dev with one instance stopped measured
      // 16.86s end to end — the hub's 15s wait plus handshake, processing and
      // reply. 20s would have left 3.1s of margin, and production adds Global
      // Accelerator and an ALB. Firing early here reports a total failure for
      // a reset that did clear the other region, which is the defect this
      // change exists to fix, so the margin is worth more than the wait. This
      // matches the 30s the per-destination route already uses. nginx allows
      // it (NGINX_READ_TIMEOUT, 60s).
      return axios.post(url, null, { httpsAgent, timeout: 30000 })
    })
  )

  const failed = outcomes.filter((o) => o.status === 'rejected')
  failed.forEach((o) => {
    if (o.status === 'rejected') {
      logger.error('Hub circuit breaker reset failed', {
        operation: 'reset_circuit_breakers',
        ...metadata,
        errorMessage: o.reason?.message,
        statusCode: axios.isAxiosError(o.reason)
          ? o.reason.response?.status
          : undefined,
      })
    }
  })

  // IGDD-3599: copy `regions` and nothing else out of the hub body. The hub
  // also returns `hosts` (keyed by private AWS DNS name) and, on the fleet-wide
  // envelope, `destinations` — whose entries each carry a `statusBy` holding an
  // instance host name. Neither may reach the browser, so neither is read here;
  // this route builds its own body rather than forwarding the hub's.
  //
  // Only a single-hub call forwards the block. `resetAllCircuitBreakers` can
  // call dev, onboard and prod at once, and a hub instance knows its region but
  // not its environment, so all three answer with a `us-east-1` key. Merging
  // them lets one environment's status overwrite another's — prod reading
  // `partial` would disappear behind dev reading `complete`. Do not merge.
  const regions =
    singleHub && outcomes[0]?.status === 'fulfilled'
      ? outcomes[0].value?.data?.regions
      : undefined

  const result: CircuitBreakerResetResult = {
    attempted: outcomes.length,
    succeeded: outcomes.length - failed.length,
    failed: failed.length,
    ...(regions ? { regions } : {}),
  }

  // Fires on every path, including the one where every hub rejected, so it
  // carries the failure count rather than implying success.
  logger.info('Hub circuit breaker reset finished', {
    operation: 'reset_circuit_breakers',
    ...metadata,
    attempted: result.attempted,
    succeeded: result.succeeded,
    failed: result.failed,
    regions,
  })

  return result
}

export interface CircuitBreakerResetResult {
  attempted: number
  succeeded: number
  failed: number
  /**
   * The hub's per-region status, forwarded unchanged. Absent when the hub did
   * not send one (a pre-IGDD-3599 hub) or when several hubs were called.
   */
  regions?: HubRegionStatuses
}

/**
 * Signals every configured hub to reset all of its circuit breakers so
 * connections recover without a service restart, across all Hub environments
 * (IGDD-2812, admin "Reset All"). Mirrors the https/cert handling used by the
 * existing hub refresh + status-history calls.
 */
export const resetAllCircuitBreakers =
  async (): Promise<CircuitBreakerResetResult> => {
    const configuredHubURLs = getConfiguredHubURLs()
    const baseUrls = Array.from(
      new Set(configuredHubURLs.getIZGHubURLs().map(deriveHubRestBaseUrl))
    )

    return resetCircuitBreakersForBaseUrls(baseUrls)
  }

export const resetCircuitBreakersForEnvironment = async (
  destinationTypeId: number
): Promise<CircuitBreakerResetResult> => {
  const configuredHubURLs = getConfiguredHubURLs()
  const statusHistoryUrl = configuredHubURLs.getIZGHubURL(destinationTypeId)
  const destinationType = getDestinationType(destinationTypeId)

  return resetCircuitBreakersForBaseUrls([deriveHubRestBaseUrl(statusHistoryUrl)], {
    destinationTypeId,
    destinationType,
  })
}
