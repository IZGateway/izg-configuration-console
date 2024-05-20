import _ from 'lodash'

const configuredEndpoints = JSON.parse(process.env.IZG_STATUS_ENDPOINT_URL)

const getIZGHubURL = (id: number | string) => {
  if (_.isNumber(id)) {
    return configuredEndpoints.find((endpoint) => endpoint.typeId === id).url
  } else {
    return configuredEndpoints.find((endpoint) => endpoint.desc === id).url
  }
}

const getIZGHubURLs = () => {
  return configuredEndpoints.map((endpoint) => endpoint.url)
}

const getIZGHubEndpoints = () => {
  return configuredEndpoints
}

export { getIZGHubURL, getIZGHubURLs, getIZGHubEndpoints }
