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
    let url = null
    if (_.isNumber(id)) {
      url =
        this.statusHistoryURLs.find((endpoint) => endpoint.typeId === id)
          ?.url || null
    } else {
      url =
        this.statusHistoryURLs.find((endpoint) => endpoint.desc === id)?.url ||
        null
    }

    if (!url) {
      throw new Error(
        `The configured IZG_STATUS_ENDPOINT_URL environment variable does not have a URL for dest type ${id}. Configured URLs: ${JSON.stringify(
          this.statusHistoryURLs,
          null,
          2
        )}`
      )
    }

    return url
  }

  getIZGHubURLs() {
    return this.statusHistoryURLs.map((endpoint) => endpoint.url)
  }
}
