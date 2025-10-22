import _ from 'lodash'
import { StatusHistoryURLs } from './type/StatusHistoryURLs'
import logger from '../../logger'

export default class IZGHubStatusHistoryEndpoint {
  statusHistoryURLs: StatusHistoryURLs

  constructor(configuredStatusHistoryEndpoints: string) {
    try {
      this.statusHistoryURLs = JSON.parse(configuredStatusHistoryEndpoints)
    } catch (error) {
      logger.error('Failed to parse IZG_STATUS_ENDPOINT_URL configuration', {
        configValue: configuredStatusHistoryEndpoints,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
        configKey: 'IZG_STATUS_ENDPOINT_URL',
      })
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
