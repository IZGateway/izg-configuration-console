import useSWR, { SWRConfiguration } from 'swr'

export interface ElasticTemplateQueryParams {
  [key: string]: string | number | boolean
}

export type ElasticTemplate = string | Record<string, unknown>

export interface ElasticTemplateQueryConfig {
  index?: string
  template: ElasticTemplate
  params: ElasticTemplateQueryParams
  enabled?: boolean
  swrOptions?: SWRConfiguration
}

const buildElasticRequest = (
  template: ElasticTemplate,
  params: ElasticTemplateQueryParams
): string => {
  let request =
    typeof template === 'string' ? template : JSON.stringify(template)

  for (const [key, value] of Object.entries(params)) {
    const regex = new RegExp(`\\$\\{${key}\\}`, 'g')
    const replacement =
      typeof value === 'string'
        ? JSON.stringify(value).slice(1, -1)
        : String(value)
    request = request.replace(regex, replacement)
  }

  return request
}

const postElasticQuery = async (
  index: string | undefined,
  template: ElasticTemplate,
  params: ElasticTemplateQueryParams
) => {
  const requestBody = buildElasticRequest(template, params)
  let parsedQuery: Record<string, unknown>

  try {
    parsedQuery = JSON.parse(requestBody)
  } catch (error) {
    throw new Error('Elastic query template did not resolve to valid JSON')
  }

  const response = await fetch('/api/elasticsearch/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      index
        ? {
            index,
            query: parsedQuery,
          }
        : {
            query: parsedQuery,
          }
    ),
  })

  if (!response.ok) {
    const details = await response.json().catch(() => ({}))
    const message =
      details?.message ||
      details?.error ||
      `Elasticsearch query failed with status ${response.status}`
    throw new Error(message)
  }

  return response.json()
}

const useElasticTemplateQuery = ({
  index,
  template,
  params,
  enabled = true,
  swrOptions,
}: ElasticTemplateQueryConfig) => {
  const key = enabled
    ? [
        'elastic-template-query',
        index || '__default_index__',
        JSON.stringify(template),
        JSON.stringify(params),
      ]
    : null

  return useSWR(
    key,
    () => postElasticQuery(index, template, params),
    swrOptions
  )
}

export default useElasticTemplateQuery
