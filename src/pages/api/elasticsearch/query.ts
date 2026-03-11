import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'

/**
 * API endpoint for querying Elasticsearch
 * Forwards queries to Elasticsearch with proper authentication and error handling
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
    const { index, query } = req.body

    if (!index) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Index is required',
      })
    }

    if (!query) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Query is required',
      })
    }

    // Get Elasticsearch connection details from environment
    const elasticHost = process.env.ELASTIC_HOST || 'https://localhost:9200'
    const elasticApiKey = process.env.ELASTIC_API_KEY

    if (!elasticApiKey) {
      logger.error('ELASTIC_API_KEY not configured', {
        operation: 'elasticsearch_query',
        user: session.user.email,
        index,
      })
      return res.status(500).json({
        error: 'Server Error',
        message: 'Elasticsearch is not properly configured',
      })
    }

    // Base64 encode the API key for the Authorization header
    const encodedApiKey = Buffer.from(elasticApiKey).toString('base64')

    // Forward the query to Elasticsearch
    const response = await fetch(`${elasticHost}/${index}/_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ApiKey ${encodedApiKey}`,
      },
      body: JSON.stringify(query),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Elasticsearch query failed', {
        operation: 'elasticsearch_query',
        user: session.user.email,
        index,
        status: response.status,
        error: errorText,
      })

      return res.status(response.status).json({
        error: 'Elasticsearch Error',
        message: `Failed to query Elasticsearch: ${response.statusText}`,
        details: errorText,
      })
    }

    const data = await response.json()

    // Log successful query
    logger.info('Elasticsearch query successful', {
      operation: 'elasticsearch_query',
      user: session.user.email,
      index,
      hitsCount: data.hits?.hits?.length || 0,
      totalHits: data.hits?.total?.value || 0,
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
