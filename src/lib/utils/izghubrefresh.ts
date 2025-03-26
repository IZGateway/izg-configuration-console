import axios from 'axios'
import IZGHubStatusHistoryEndpoint from '../IZGHubStatusHistoryEndpoint'
import { Destination } from '../type/Destination'
import * as fs from 'fs'
import path from 'path'
import https from 'https'
import logger from '../../../logger'

const IZG_STATUS_ENDPOINT_URL = process.env.IZG_STATUS_ENDPOINT_URL || ''
const configuredHubURLs = new IZGHubStatusHistoryEndpoint(
  IZG_STATUS_ENDPOINT_URL
)

const izgHubRefresh = (destination: Destination) => {
  const IZG_ENDPOINT_CRT_PATH = process.env.IZG_ENDPOINT_CRT_PATH || undefined
  const IZG_ENDPOINT_KEY_PATH = process.env.IZG_ENDPOINT_KEY_PATH || undefined
  const IZG_ENDPOINT_PASSCODE = process.env.IZG_ENDPOINT_PASSCODE || undefined
  const httpsAgentOptions = {
    cert: fs.readFileSync(path.resolve(IZG_ENDPOINT_CRT_PATH), 'utf-8'),
    key: fs.readFileSync(path.resolve(IZG_ENDPOINT_KEY_PATH), 'utf-8'),
    passphrase: IZG_ENDPOINT_PASSCODE,
    rejectUnauthorized: false,
    keepAlive: true,
  }
  // Call the refresh endpoint on the specified destination.
  // It is [host]/rest/refresh?all=true where host = status endpoint host for specified destId
  let url = configuredHubURLs.getIZGHubURL(destination.destinationType.typeId)
  url = url.substring(0, url.indexOf('/rest/') + 6) + 'refresh?all=true'
  axios.get(url, {
    httpsAgent: new https.Agent(httpsAgentOptions),
    timeout: 5000,
  })
  logger.debug(
    `refreshHub called with destType: ${destination.destinationType.type} and url: ${url}`
  )
}

export { izgHubRefresh }
