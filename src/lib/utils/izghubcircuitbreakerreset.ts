/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios'
import * as fs from 'fs'
import path from 'path'
import https from 'https'
import IZGHubStatusHistoryEndpoint from '../IZGHubStatusHistoryEndpoint'
import logger from '../../../logger'

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

export interface CircuitBreakerResetResult {
  attempted: number
  succeeded: number
  failed: number
}

/**
 * Signals every configured hub to reset all of its circuit breakers so
 * connections recover without a service restart, across all Hub environments
 * (IGDD-2812, admin "Reset All"). Mirrors the https/cert handling used by the
 * existing hub refresh + status-history calls.
 */
export const resetAllCircuitBreakers =
  async (): Promise<CircuitBreakerResetResult> => {
    const configuredHubURLs = new IZGHubStatusHistoryEndpoint(
      process.env.IZG_STATUS_ENDPOINT_URL || ''
    )
    const baseUrls = Array.from(
      new Set(configuredHubURLs.getIZGHubURLs().map(deriveHubRestBaseUrl))
    )
    const httpsAgent = new https.Agent(getHttpsAgentOptions())

    const outcomes = await Promise.allSettled(
      baseUrls.map((baseUrl) => {
        const url = `${baseUrl}${CIRCUIT_BREAKER_RESET_PATH}`
        logger.info('Signaling hub to reset all circuit breakers', {
          url,
          operation: 'reset_circuit_breakers',
        })
        return axios.post(url, null, { httpsAgent, timeout: 5000 })
      })
    )

    const failed = outcomes.filter((o) => o.status === 'rejected')
    failed.forEach((o) => {
      if (o.status === 'rejected') {
        logger.error('Hub circuit breaker reset failed', {
          operation: 'reset_circuit_breakers',
          errorMessage: o.reason?.message,
          statusCode: axios.isAxiosError(o.reason)
            ? o.reason.response?.status
            : undefined,
        })
      }
    })

    return {
      attempted: outcomes.length,
      succeeded: outcomes.length - failed.length,
      failed: failed.length,
    }
  }
