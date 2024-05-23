import _ from 'lodash'
import { StatusHistoryURLs } from './type/StatusHistoryURLs'
import logger from '../../logger'

export default class IZGHubStatusHistoryEndpoint {
  statusHistoryURLs: StatusHistoryURLs

  constructor(configuredStatusHistoryEndpoints: string) {
    try {
      this.statusHistoryURLs = JSON.parse(configuredStatusHistoryEndpoints)
    } catch (e) {
      logger.error(
        `The configured IZG_STATUS_ENDPOINT_URL value is not valid JSON. Tried to parse ${configuredStatusHistoryEndpoints}. ERROR: ${e}. `
      )
    }
  }

  getIZGHubURL(id: number | string) {
    if (_.isNumber(id)) {
      return this.statusHistoryURLs.find((endpoint) => endpoint.typeId === id)
        .url
    }
    return this.statusHistoryURLs.find((endpoint) => endpoint.desc === id).url
  }

  getIZGHubURLs() {
    return this.statusHistoryURLs.map((endpoint) => endpoint.url)
  }
}
