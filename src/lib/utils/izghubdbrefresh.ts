/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios'
import * as fs from 'fs'
import path from 'path'
import https from 'https'
import IZGHubStatusHistoryEndpoint from '../IZGHubStatusHistoryEndpoint'
import logger from '../../../logger'

/**
 * Hub refresh REST path, relative to the hub's `/rest/` base. Signals a hub to
 * reload its configuration from the database. Matches the per-destination
 * refresh already used after config changes (see ./izghubrefresh.ts).
 * Overridable via env for non-standard deployments.
 */
const HUB_REFRESH_PATH =
  process.env.IZG_HUB_REFRESH_PATH || 'refresh?all=true'

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

export interface HubRefreshResult {
  attempted: number
  succeeded: number
  failed: number
}

/**
 * Signals every configured hub to refresh its configuration from the database,
 * across all Hub environments (IGDD-2272 global DB refresh). Mirrors the
 * https/cert handling used by the existing hub refresh + status-history calls.
 */
export const refreshAllHubs = async (): Promise<HubRefreshResult> => {
  const configuredHubURLs = new IZGHubStatusHistoryEndpoint(
    process.env.IZG_STATUS_ENDPOINT_URL || ''
  )
  const baseUrls = Array.from(
    new Set(configuredHubURLs.getIZGHubURLs().map(deriveHubRestBaseUrl))
  )
  const httpsAgent = new https.Agent(getHttpsAgentOptions())

  const outcomes = await Promise.allSettled(
    baseUrls.map((baseUrl) => {
      const url = `${baseUrl}${HUB_REFRESH_PATH}`
      logger.info('Signaling hub to refresh from database', {
        url,
        operation: 'refresh_database',
      })
      return axios.get(url, { httpsAgent, timeout: 5000 })
    })
  )

  const failed = outcomes.filter((o) => o.status === 'rejected')
  failed.forEach((o) => {
    if (o.status === 'rejected') {
      logger.error('Hub database refresh failed', {
        operation: 'refresh_database',
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
