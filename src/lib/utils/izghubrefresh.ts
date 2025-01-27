import IZGHubStatusHistoryEndpoint from '../IZGHubStatusHistoryEndpoint'
import { Destination } from '../type/Destination'

const IZG_STATUS_ENDPOINT_URL = process.env.IZG_STATUS_ENDPOINT_URL || ''
const configuredHubURLs = new IZGHubStatusHistoryEndpoint(
  IZG_STATUS_ENDPOINT_URL
)

const izgHubRefresh = (destination: Destination) => {
  // Call the refresh endpoint on the specified destination.
  // It is [host]/rest/refresh?all=true where host = status endpoint host for specified destId
  let url = configuredHubURLs.getIZGHubURL(destination.destinationType.typeId)
  url = url.substring(0, url.indexOf('/rest/') + 6) + 'refresh?all=true'
  // axios.get(url, {
  //   httpsAgent: IZGHubHttpsAgent,
  //   timeout: 5000,
  // })
  console.log(
    `refreshHub called with destType: ${destination.destinationType.type} and url: ${url}`
  )
}

export { izgHubRefresh }
