import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

/**
 * @swagger
 * /api/destinations:
 *   get:
 *     summary: Get all destinations accessible to the logged-in user
 *     responses:
 *       200:
 *         description: List of destinations
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const session = await getServerSession(req, res, authOptions)

      if (!session?.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const isAdmin = session.user.isAdmin || false
      const jurisdictions = session.user.destinations || []

      const dbClient = await DbClientFactory.getDbClient()
      const result = await dbClient.fetchLoggedInUsersDestinations(
        isAdmin,
        jurisdictions
      )

      return res.status(200).json(result)
    } catch (error) {
      logger.error('Error fetching destinations', {
        operation: 'fetchDestinations',
        httpMethod: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  res.setHeader('Allow', ['GET'])
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
}

export default withMiddleware()(handler)
