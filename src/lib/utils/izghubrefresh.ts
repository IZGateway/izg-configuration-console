import axios from 'axios'
import IZGHubStatusHistoryEndpoint from '../IZGHubStatusHistoryEndpoint'
import { Destination } from '../type/Destination'
import { IZGHubHttpsAgent } from './izghubhttpsagent'
import logger from '../../../logger'

const IZG_STATUS_ENDPOINT_URL = process.env.IZG_STATUS_ENDPOINT_URL || ''
const configuredHubURLs = new IZGHubStatusHistoryEndpoint(
  IZG_STATUS_ENDPOINT_URL
)

const izgHubRefresh = (destination: Destination) => {
  // Call the refresh endpoint on the specified destination.
  // It is [host]/rest/refresh?all=true where host = status endpoint host for specified destId
  let url = configuredHubURLs.getIZGHubURL(destination.destinationType.typeId)
  url = url.substring(0, url.indexOf('/rest/') + 6) + 'refresh?all=true'
  try {
    axios.get(url, {
      httpsAgent: IZGHubHttpsAgent,
      timeout: 5000,
    })
  } catch (err) {
    // Ignore refresh errors
  }
}

export { izgHubRefresh }
