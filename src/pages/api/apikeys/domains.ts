import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized - Please login' })
    }

    const { envId } = req.query
    if (!envId || typeof envId !== 'string') {
      return res.status(400).json({ error: 'envId is required' })
    }

    const dbClient = await DbClientFactory.getDbClient()
    const domains = await dbClient.fetchAuthorizedApiKeyDomains(envId)

    return res.status(200).json(domains)
  } catch (error) {
    logger.error('Error fetching authorized API key domains', {
      operation: 'fetchAuthorizedApiKeyDomains',
      httpMethod: req.method,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withMiddleware()(handler)
