/**
 * Generalized Next.js Library for querying Elasticsearch
 * Inspired by ElasticStatusRepository structure
 *
 * The main class, ElasticRepositoryClient, provides:
 * - getRequest(params): builds request body from template with parameter replacements
 * - getData(params): sends request to Elasticsearch and returns parsed JS object
 */

interface ElasticRepositoryConfig {
  elasticUrl?: string
  apiKey?: string
  template: string | Record<string, unknown>
}

interface QueryParams {
  [key: string]: string | number | boolean
}

/**
 * ElasticRepositoryClient provides a generalized interface for querying Elasticsearch
 * Uses template-based parameter substitution for flexible query building
 *
 * Example:
 * const client = new ElasticRepositoryClient({
 *   elasticUrl: process.env.ELASTIC_HOST,
 *   apiKey: process.env.ELASTIC_API_KEY,
 *   template: `{
 *     "query": {
 *       "range": {
 *         "timestamp": {
 *           "gte": "${start}",
 *           "lte": "${end}"
 *         }
 *       }
 *     }
 *   }`
 * })
 *
 * const data = await client.getData({ start: '2026-01-01', end: '2026-01-31' })
 */
export class ElasticRepositoryClient {
  private elasticUrl: string
  private apiKey: string
  private template: string

  constructor(config: ElasticRepositoryConfig) {
    this.elasticUrl = process.env.ELASTIC_HOST || 'https://localhost:9200'
    this.apiKey = process.env.ELASTIC_API_KEY || ''
    // Convert template object to JSON string if needed
    this.template =
      typeof config.template === 'string'
        ? config.template
        : JSON.stringify(config.template)
  }

  /**
   * Build the request body by replacing template placeholders with parameter values
   * Replaces all ${key} patterns with corresponding values from params map
   *
   * @param params - Map of key-value pairs to replace in template
   * @returns String containing the populated request body
   *
   * Example:
   * Template: '{"query": {"term": {"status": "${status}"}}}'
   * Params: { status: 'active' }
   * Result: '{"query": {"term": {"status": "active"}}}'
   */
  getRequest(params: QueryParams): string {
    let request = this.template

    for (const [key, value] of Object.entries(params)) {
      // Replace ${key} with the value (with proper escaping for regex special chars)
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g')
      request = request.replace(regex, String(value))
    }

    return request
  }

  /**
   * Send request to Elasticsearch and return parsed JavaScript object
   * Handles authentication and error responses
   *
   * @param params - Map of parameters to substitute in template
   * @returns Promise with parsed Elasticsearch response
   *
   * Example:
   * const response = await client.getData({
   *   start: '2026-01-01T00:00:00Z',
   *   end: '2026-01-31T23:59:59Z'
   * })
   * // Response: { hits: { total: { value: 100 }, hits: [...] }, took: 15, ... }
   */
  async getData(params: QueryParams): Promise<unknown> {
    try {
      const body = this.getRequest(params)

      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (this.apiKey) {
        headers['Authorization'] = `ApiKey ${this.apiKey}`
      }

      // Send request to Elasticsearch
      const response = await fetch(this.elasticUrl, {
        method: 'POST',
        headers,
        body,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Elasticsearch error: ${response.status} - ${errorText}`
        )
      }

      return await response.json()
    } catch (error) {
      console.error('ElasticRepositoryClient.getData error:', error)
      throw error
    }
  }

  /**
   * Helper method to create a client with a custom template for a specific query
   *
   * @param template - Elasticsearch query template with ${param} placeholders
   * @returns New ElasticRepositoryClient instance
   *
   * Example:
   * const client = ElasticRepositoryClient.create(
   *   '{"query": {"match": {"message": "${searchTerm}"}}}'
   * )
   */
  static create(
    template: string | Record<string, unknown>
  ): ElasticRepositoryClient {
    return new ElasticRepositoryClient({ template })
  }

  /**
   * Get hardcoded test data with searchTerm, startDate, and endDate
   * Used for development/testing purposes
   *
   * Hardcoded values:
   * - searchTerm: 'error'
   * - startDate: '2026-01-01T00:00:00Z'
   * - endDate: '2026-01-31T23:59:59Z'
   *
   * @returns Promise with test data
   *
   * Example:
   * const results = await client.getTestData()
   */
  async getTestData(): Promise<unknown> {
    const hardcodedParams = {
      searchTerm: 'error',
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-01-31T23:59:59Z',
    }

    return this.getData(hardcodedParams)
  }
}

export default ElasticRepositoryClient
