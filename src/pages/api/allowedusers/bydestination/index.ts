import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../../api-middleware-helper'
import logger from '../../../../../logger'
import DbClientFactory from '../../../../lib/db/DbClientFactory'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import isOperationsRole from '../../../../lib/security/accessutils'

/**
 * @swagger
 * /api/allowedusers/bydestination:
 *   get:
 *     summary: Get allowed users filtered by destination
 *     description: Returns allowed users based on the authenticated user's permissions. Admin users see all allowed users, while non-admin users only see allowed users for their assigned destinations.
 *     responses:
 *       200:
 *         description: OK. Returns array of allowed users filtered by destination access.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   principal:
 *                     type: string
 *                     description: The principal/user identifier
 *                   environment:
 *                     type: number
 *                     description: The environment ID
 *                   destinationId:
 *                     type: string
 *                     description: The destination ID
 *                   enabled:
 *                     type: boolean
 *                     description: Whether the user is enabled
 *                   createdBy:
 *                     type: string
 *                     description: User who created this record
 *                   createdOn:
 *                     type: string
 *                     format: date-time
 *                     description: When the record was created
 *                   updatedBy:
 *                     type: string
 *                     description: User who last updated this record
 *                   updatedOn:
 *                     type: string
 *                     format: date-time
 *                     description: When the record was last updated
 *                   validatedOn:
 *                     type: string
 *                     format: date-time
 *                     description: When the user was last validated
 *       401:
 *         description: Unauthorized - user not authenticated
 *       500:
 *         description: Internal server error
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    logger.info('Received GET request to fetch allowed users by destination')

    try {
      const session = await getServerSession(req, res, authOptions)

      if (!session) {
        logger.warn('Unauthorized request - no session found', {
          operation: 'fetchAllowedUsersByDestination',
          httpMethod: req.method,
          endpoint: req.url,
        })
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const isAdmin = isOperationsRole(session.user.role)
      const destinations = session.user.jurisdictions || []

      logger.info('Fetching allowed users by destination', {
        isAdmin,
        destinationsCount: destinations.length,
        userRole: session.user.role,
        operation: 'fetchAllowedUsersByDestination',
        httpMethod: req.method,
        endpoint: req.url,
      })

      const dbClient = await DbClientFactory.getDbClient()
      const result = await dbClient.fetchAllowedUsersByDestination(
        isAdmin,
        destinations
      )

      logger.info('Successfully fetched allowed users by destination', {
        count: result.length,
        isAdmin,
        operation: 'fetchAllowedUsersByDestination',
        httpMethod: req.method,
        endpoint: req.url,
      })

      // Serialize dates to ISO strings for JSON response
      const serializedResult = result.map((user) => ({
        principal: user.principal,
        environment: user.environment,
        destinationId: user.destinationId,
        enabled: user.enabled,
        createdBy: user.createdBy,
        createdOn: user.createdOn?.toISOString() || null,
        updatedBy: user.updatedBy,
        updatedOn: user.updatedOn?.toISOString() || null,
        validatedOn: user.validatedOn?.toISOString() || null,
      }))

      return res.status(200).json(serializedResult)
    } catch (error) {
      logger.error('Failed to fetch allowed users by destination', {
        errorMessage: error?.message || 'Unknown error',
        errorType: error?.name || 'Unknown',
        stack: error?.stack || 'No stack trace',
        operation: 'fetchAllowedUsersByDestination',
        httpMethod: req.method,
        endpoint: req.url,
        errorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      })

      return res.status(500).json({
        error: 'Failed to fetch allowed users by destination',
        message: error?.message || 'Unknown error',
      })
    }
  } else {
    logger.info('Received unsupported HTTP method', {
      method: req.method,
      endpoint: req.url,
    })

    return res.status(405).json({
      error: `The HTTP ${req.method} method is not supported at this route.`,
    })
  }
}

export default withMiddleware('captureErrors')(handler)
