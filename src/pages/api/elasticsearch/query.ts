import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import withMiddleware from '../api-middleware-helper'
import { elasticClient } from '../../../lib/repositories/ElasticRepository'

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

    logger.info('Elasticsearch query requested', {
      operation: 'elasticsearch_query',
      user: session.user.email,
      index,
      query,
    })

    // Get Elasticsearch connection details from environment
    const elasticHost = process.env.ELASTIC_HOST || 'https://localhost:9200'
    const elasticApiKey = process.env.ELASTIC_API_KEY

    if (!elasticApiKey) {
      logger.error('ELASTIC_API_KEY not configured', {
        operation: 'elasticsearch_query',
        user: session.user.email,
        index,
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
      query,
      session.user.email || undefined
    )

    res.status(200).json(data)
  } catch (error) {
    res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred while querying Elasticsearch',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export default withMiddleware()(handler)
