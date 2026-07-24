import axios from 'axios'
import * as fs from 'fs'
import path from 'path'
import https from 'https'
import IZGHubStatusHistoryEndpoint from '../IZGHubStatusHistoryEndpoint'
import logger from '../../../logger'
import { getDestinationType } from '../desttypehelper'

/**
 * Hub circuit-breaker reset REST path, relative to the hub's `/rest/` base.
 *
 * Per the IGDD-2812 design (Hub Backend Changes), reset-all is `POST
 * [hubHost]/rest/reset`. Overridable via env for non-standard deployments.
 */
const CIRCUIT_BREAKER_RESET_PATH =
  process.env.IZG_CIRCUIT_BREAKER_RESET_PATH || 'reset'

const ENVIRONMENT_LABELS: Record<string, string> = {
  DEV: 'Development',
  PRODUCTION: 'Production',
  TEST: 'Testing',
  ONBOARD: 'Onboarding',
  STAGE: 'Staging',
  UNKNOWN: 'Unknown',
}

const ENVIRONMENT_PRIORITY: Record<string, number> = {
  PRODUCTION: 0,
  ONBOARD: 1,
  STAGE: 2,
  DEV: 3,
  TEST: 4,
  UNKNOWN: 5,
}

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

const getEnvironmentLabel = (destinationTypeId: number, desc: string) => {
  const destinationType = getDestinationType(destinationTypeId)
  if (destinationType !== 'UNKNOWN') {
    return ENVIRONMENT_LABELS[destinationType]
  }

  return desc || `Environment ${destinationTypeId}`
}

const resetCircuitBreakersForBaseUrls = async (
  baseUrls: string[],
  metadata?: { destinationTypeId?: number; destinationType?: string }
): Promise<CircuitBreakerResetResult> => {
  const httpsAgent = new https.Agent(getHttpsAgentOptions())

  const outcomes = await Promise.allSettled(
    baseUrls.map((baseUrl) => {
      const url = `${baseUrl}${CIRCUIT_BREAKER_RESET_PATH}`
      logger.info('Signaling hub to reset all circuit breakers', {
        url,
        operation: 'reset_circuit_breakers',
        ...metadata,
      })
      return axios.post(url, null, { httpsAgent, timeout: 5000 })
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

  return {
    attempted: outcomes.length,
    succeeded: outcomes.length - failed.length,
    failed: failed.length,
  }
}

export interface CircuitBreakerResetResult {
  attempted: number
  succeeded: number
  failed: number
}

export interface CircuitBreakerResetEnvironment {
  destinationTypeId: number
  destinationType: string
  label: string
}

export const getCircuitBreakerResetEnvironments =
  (): CircuitBreakerResetEnvironment[] => {
    const configuredHubURLs = getConfiguredHubURLs()
    const environments = configuredHubURLs.getIZGHubEndpointMetadata().map(
      ({ typeId, desc }) => {
        const destinationType = getDestinationType(typeId)
        return {
          destinationTypeId: typeId,
          destinationType,
          label: getEnvironmentLabel(typeId, desc),
        }
      }
    )

    return Array.from(
      new Map(
        environments.map((environment) => [
          environment.destinationTypeId,
          environment,
        ])
      ).values()
    ).sort(
      (a, b) =>
        (ENVIRONMENT_PRIORITY[a.destinationType] ?? 99) -
        (ENVIRONMENT_PRIORITY[b.destinationType] ?? 99)
    )
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
