import IZGHubStatusHistoryEndpoint from '../IZGHubStatusHistoryEndpoint'
import desttypehelper, { getDestinationType } from '../desttypehelper'

export interface HubEnvironment {
  destinationTypeId: number
  destinationType: string
  label: string
}

const getConfiguredHubURLs = () =>
  new IZGHubStatusHistoryEndpoint(process.env.IZG_STATUS_ENDPOINT_URL || '')

const getEnvironmentLabel = (
  destinationType: string,
  destinationTypeId: number,
  desc: string
) => {
  const label = desttypehelper.destTypeFormattedToSyncWithApi(destinationType)

  if (label !== 'NA' && label !== 'UNKNOWN') {
    return label
  }

  return desc || `Environment ${destinationTypeId}`
}

export const getHubEnvironments = (): HubEnvironment[] => {
  const configuredHubURLs = getConfiguredHubURLs()
  const environments = configuredHubURLs.getIZGHubEndpointMetadata().map(
    ({ typeId, desc }) => {
      const destinationType = getDestinationType(typeId)
      return {
        destinationTypeId: typeId,
        destinationType,
        label: getEnvironmentLabel(destinationType, typeId, desc),
      }
    }
  )

  // Preserve the order configured in IZG_STATUS_ENDPOINT_URL, deduping by
  // destination type so a single environment renders one button.
  return Array.from(
    new Map(
      environments.map((environment) => [
        environment.destinationTypeId,
        environment,
      ])
    ).values()
  )
}
