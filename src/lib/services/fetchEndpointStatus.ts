/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'fs'
import path from 'path'
import https from 'https'
import axios from 'axios'
import IZGHubStatusHistoryEndpoint from '../IZGHubStatusHistoryEndpoint'
import isOperationsRole from '../security/accessutils'

const ALL_SETTLED_SUCCESSFUL = 'fulfilled'

export const fetchEndpointStatus = async (
  roles: string[],
  jurisdictions: string[]
): Promise<any[]> => {
  const IZG_STATUS_ENDPOINT_URL = process.env.IZG_STATUS_ENDPOINT_URL || ''
  const IZG_ENDPOINT_CRT_PATH = process.env.IZG_ENDPOINT_CRT_PATH || ''
  const IZG_ENDPOINT_KEY_PATH = process.env.IZG_ENDPOINT_KEY_PATH || ''
  const IZG_ENDPOINT_PASSCODE = process.env.IZG_ENDPOINT_PASSCODE || ''
  const httpsAgentOptions = {
    cert: fs.readFileSync(path.resolve(IZG_ENDPOINT_CRT_PATH), 'utf-8'),
    key: fs.readFileSync(path.resolve(IZG_ENDPOINT_KEY_PATH), 'utf-8'),
    passphrase: IZG_ENDPOINT_PASSCODE,
    rejectUnauthorized: false,
    keepAlive: true,
  }

  const configuredHubURLs = new IZGHubStatusHistoryEndpoint(
    IZG_STATUS_ENDPOINT_URL
  )
  let hubURLs = configuredHubURLs.getIZGHubURLs()

  if (!isOperationsRole(roles)) {
    hubURLs = appendJurisdictionsAssignedToUser(hubURLs, jurisdictions)
  }

  const responses = await Promise.allSettled(
    hubURLs.map((endpoint) =>
      axios.get(endpoint, {
        httpsAgent: new https.Agent(httpsAgentOptions),
        timeout: 30000,
      })
    )
  )

  return responses
    .filter((response) => response.status === ALL_SETTLED_SUCCESSFUL)
    .map((response: any) => response.value.data)
    .flatMap((data) => Object.values(data).map((value: any) => {
      const endpoint = value[0]
      // Remove statusBy field to prevent private IP/DNS being delivered to client
      delete endpoint.statusBy
      return endpoint
    }))
}

const appendJurisdictionsAssignedToUser = (
  hubURLs: string[],
  jurisdictions: string[]
): string[] => {
  return hubURLs.map((izgUrl) => `${izgUrl}?include=${jurisdictions.join(',')}`)
}