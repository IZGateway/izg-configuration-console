/**
 * Server-side Elasticsearch Repository
 * Provides a clean interface for querying Elasticsearch from API routes
 *
 * IMPORTANT: This module is for SERVER-SIDE USE ONLY (API routes)
 * Do not import this in client-side components as it uses server environment variables
 *
 * The main class, ElasticRepositoryClient, provides:
 * - query(index, queryBody): sends a query to Elasticsearch and returns parsed response
 * - queryWithTemplate(index, template, params): builds query from template and executes
 */

import logger from '../../../logger'

interface ElasticRepositoryConfig {
  elasticHost?: string
  apiKey?: string
}

interface QueryParams {
  [key: string]: string | number | boolean
}

interface ElasticsearchResponse {
  hits?: {
    total?: { value: number }
    hits?: unknown[]
  }
  aggregations?: Record<string, unknown>
  took?: number
  timed_out?: boolean
  _shards?: {
    total: number
    successful: number
    skipped: number
    failed: number
  }
}

/**
 * ElasticRepositoryClient provides a server-side interface for querying Elasticsearch
 * Handles authentication, error handling, and logging
 *
 * Example usage in API route:
 * ```
 * import { elasticClient } from '@/lib/repositories/ElasticRepository'
 *
 * const data = await elasticClient.query('my-index', {
 *   query: { match_all: {} }
 * })
 * ```
 */
export class ElasticRepositoryClient {
  private elasticHost: string
  private apiKey: string

  constructor(config?: ElasticRepositoryConfig) {
    this.elasticHost = config?.elasticHost || process.env.ELASTIC_HOST || ''
    this.apiKey = config?.apiKey || process.env.ELASTIC_API_KEY || ''
  }

  /**
   * Check if the client is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.elasticHost && this.apiKey)
  }

  /**
   * Build request headers for Elasticsearch API calls
   */
  private getHeaders(): Record<string, string> {
    const encodedApiKey = Buffer.from(this.apiKey).toString('base64')
    return {
      'Content-Type': 'application/json',
      Authorization: `ApiKey ${encodedApiKey}`,
    }
  }

  /**
   * Execute a query against Elasticsearch
   *
   * @param index - The Elasticsearch index to query
   * @param queryBody - The query body object
   * @param userEmail - Optional user email for logging
   * @returns Promise with parsed Elasticsearch response
   *
   * Example:
   * ```
   * const response = await client.query('izgw-dev-logstash', {
   *   query: { match: { status: 'success' } },
   *   size: 10
   * })
   * ```
   */
  async query(
    index: string,
    queryBody: Record<string, unknown>,
    userEmail?: string
  ): Promise<ElasticsearchResponse> {
    if (!this.isConfigured()) {
      logger.error('ElasticRepositoryClient not configured', {
        operation: 'elasticsearch_query',
        hasHost: Boolean(this.elasticHost),
        hasApiKey: Boolean(this.apiKey),
      })
      throw new Error('Elasticsearch is not properly configured')
    }

    try {
      const url = `${this.elasticHost}/${index}/_search`

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(queryBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('Elasticsearch query failed', {
          operation: 'elasticsearch_query',
          user: userEmail,
          index,
          status: response.status,
          error: errorText,
        })
        throw new Error(
          `Elasticsearch query failed: ${response.status} - ${errorText}`
        )
      }

      const data = (await response.json()) as ElasticsearchResponse

      logger.info('Elasticsearch query successful', {
        operation: 'elasticsearch_query',
        user: userEmail,
        index,
        hitsCount: data.hits?.hits?.length || 0,
        totalHits: data.hits?.total?.value || 0,
      })

      return data
    } catch (error) {
      logger.error('ElasticRepositoryClient.query error', {
        operation: 'elasticsearch_query',
        user: userEmail,
        index,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Build and execute a query using template-based parameter substitution
   *
   * @param index - The Elasticsearch index to query
   * @param template - Query template with ${param} placeholders
   * @param params - Map of parameters to substitute in template
   * @param userEmail - Optional user email for logging
   * @returns Promise with parsed Elasticsearch response
   *
   * Example:
   * ```
   * const response = await client.queryWithTemplate(
   *   'my-index',
   *   '{"query": {"range": {"@timestamp": {"gte": "${startDate}", "lte": "${endDate}"}}}}',
   *   { startDate: '2026-01-01', endDate: '2026-01-31' }
   * )
   * ```
   */
  async queryWithTemplate(
    index: string,
    template: string | Record<string, unknown>,
    params: QueryParams,
    userEmail?: string
  ): Promise<ElasticsearchResponse> {
    const templateStr =
      typeof template === 'string' ? template : JSON.stringify(template)

    let populatedQuery = templateStr
    for (const [key, value] of Object.entries(params)) {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g')
      populatedQuery = populatedQuery.replace(regex, String(value))
    }

    const queryBody = JSON.parse(populatedQuery)
    return this.query(index, queryBody, userEmail)
  }

  /**
   * Create a new client instance with custom configuration
   */
  static create(config?: ElasticRepositoryConfig): ElasticRepositoryClient {
    return new ElasticRepositoryClient(config)
  }
}

/**
 * Default singleton instance using environment variables
 * Use this for most cases in API routes
 */
export const elasticClient = new ElasticRepositoryClient()

export default ElasticRepositoryClient
