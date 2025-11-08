import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'

/**
 * @swagger
 * /api/allowedusers:
 *   get:
 *     summary: Get all allowed users
 *     responses:
 *       200:
 *         description: OK. Returns array of allowed users.
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
 *       500:
 *         description: Internal server error
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const dbClient = await DbClientFactory.getDbClient()
      const result = await dbClient.fetchAllowedUsers()

      logger.info('Successfully fetched allowed users', {
        count: result.length,
        operation: 'fetchAllowedUsers',
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

      logger.info('About to send response', {
        count: serializedResult.length,
        sampleRecord: serializedResult[0] || null,
      })

      return res.status(200).json(serializedResult)
    } catch (error) {
      logger.error('Failed to fetch allowed users', {
        errorMessage: error?.message || 'Unknown error',
        errorType: error?.name || 'Unknown',
        stack: error?.stack || 'No stack trace',
        operation: 'fetchAllowedUsers',
        httpMethod: req.method,
        endpoint: req.url,
        errorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      })

      return res.status(500).json({
        error: 'Failed to fetch allowed users',
        message: error?.message || 'Unknown error',
      })
    }
  } else {
    return res.status(405).json({
      error: `The HTTP ${req.method} method is not supported at this route.`,
    })
  }
}

export default withMiddleware('captureErrors')(handler)
