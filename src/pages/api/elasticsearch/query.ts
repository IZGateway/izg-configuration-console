import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import withMiddleware from '../api-middleware-helper'
import { elasticClient } from '../../../lib/repositories/ElasticRepository'
import logger from '../../../../logger'

/**
 * API endpoint for querying Elasticsearch
 * Uses ElasticRepositoryClient for proper authentication and error handling
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Only allow authenticated admin users
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.isAdmin) {
    return res.status(403).json({
      error: 'Unauthorized',
      message: 'Only admin users can access Elasticsearch queries',
    })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only POST requests are supported',
    })
  }

  try {
    const index =
      process.env.OPERATIONS_CONSOLE_ELASTIC_INDEX || 'izgw-dev-logstash'
    const { query } = req.body

    if (!query) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Query is required',
      })
    }

    if (typeof query !== 'object' || query === null || Array.isArray(query)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Query must be a JSON object',
      })
    }

    const queryObject = query as Record<string, unknown>
    const aggregations = queryObject?.aggs as
      | Record<string, unknown>
      | undefined
    const hasSystemResourcesAggs =
      Boolean(aggregations?.cpu) &&
      Boolean(aggregations?.memory) &&
      Boolean(aggregations?.disk) &&
      Boolean(aggregations?.connections)

    if (hasSystemResourcesAggs) {
      aggregations.connections = {
        max: {
          field: 'system.socket.summary.tcp.all.established',
          missing: 0,
        },
      }
    }

    const queryMetadata = {
      type: typeof query,
      isArray: Array.isArray(query),
      fieldCount:
        query && typeof query === 'object' && !Array.isArray(query)
          ? Object.keys(query).length
          : undefined,
      hasConnectionsAgg: Boolean(aggregations?.connections),
      hasSystemResourcesAggs,
      connectionsField:
        (
          aggregations?.connections as {
            max?: { field?: string; script?: unknown }
          }
        )?.max?.field ||
        ((
          aggregations?.connections as {
            max?: { field?: string; script?: unknown }
          }
        )?.max?.script
          ? 'script'
          : undefined),
    }

    logger.info('Elasticsearch query requested', {
      operation: 'elasticsearch_query',
      user: session.user.email,
      index,
      queryMetadata,
    })

    // Check if Elasticsearch is properly configured
    if (!elasticClient.isConfigured()) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Elasticsearch is not properly configured',
      })
    }

    // Execute the query using ElasticRepositoryClient
    const data = await elasticClient.query(
      index,
      queryObject,
      session.user.email || undefined
    )

    // Log successful query
    logger.info('Elasticsearch query successful', {
      operation: 'elasticsearch_query',
      user: session.user.email,
      index,
      hitsCount: data.hits?.hits?.length || 0,
      totalHits: data.hits?.total?.value || 0,
      connectionsValue: (
        data.aggregations as Record<string, { value?: number }>
      )?.connections?.value,
    })

    res.status(200).json(data)
  } catch (error) {
    logger.error('Elasticsearch query error', {
      operation: 'elasticsearch_query',
      error: error instanceof Error ? error.message : String(error),
      user: session?.user?.email,
    })

    res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred while querying Elasticsearch',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export default withMiddleware()(handler)
