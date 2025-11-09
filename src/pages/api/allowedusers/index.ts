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
 *   post:
 *     summary: Create or update an allowed user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - principal
 *               - environment
 *               - destinationId
 *               - enabled
 *               - createdBy
 *               - updatedBy
 *             properties:
 *               principal:
 *                 type: string
 *                 description: The principal/user identifier
 *               environment:
 *                 type: number
 *                 description: The environment ID
 *               destinationId:
 *                 type: string
 *                 description: The destination ID
 *               enabled:
 *                 type: boolean
 *                 description: Whether the user is enabled
 *               createdBy:
 *                 type: string
 *                 description: User who created this record
 *               updatedBy:
 *                 type: string
 *                 description: User who last updated this record
 *     responses:
 *       200:
 *         description: OK. Returns the created/updated allowed user.
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    logger.info('Received GET request to fetch allowed users')
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
  } else if (req.method === 'POST') {
    logger.info('Received POST request to upsert allowed user')

    try {
      // Next.js automatically parses JSON body, so req.body is already an object
      const body =
        typeof req.body === 'string' ? JSON.parse(req.body) : req.body

      // Validate required fields
      const requiredFields = [
        'principal',
        'environment',
        'destinationId',
        'enabled',
        'createdBy',
        'updatedBy',
      ]
      const missingFields = requiredFields.filter(
        (field) => !body.hasOwnProperty(field)
      )

      if (missingFields.length > 0) {
        logger.warn('Missing required fields in POST request', {
          missingFields,
          operation: 'upsertAllowedUser',
          httpMethod: req.method,
          endpoint: req.url,
        })
        return res.status(400).json({
          error: 'Missing required fields',
          missingFields,
        })
      }

      const dbClient = await DbClientFactory.getDbClient()

      // Create AllowedUser object
      const allowedUser = {
        principal: body.principal,
        environment: body.environment,
        destinationId: body.destinationId,
        enabled: body.enabled,
        createdBy: body.createdBy,
        createdOn: body.createdOn ? new Date(body.createdOn) : new Date(),
        updatedBy: body.updatedBy,
        updatedOn: new Date(),
        validatedOn: body.validatedOn ? new Date(body.validatedOn) : null,
      }

      const result = await dbClient.upsertAllowedUser(allowedUser)

      logger.info('Successfully upserted allowed user', {
        principal: result.principal,
        environment: result.environment,
        destinationId: result.destinationId,
        operation: 'upsertAllowedUser',
        httpMethod: req.method,
        endpoint: req.url,
      })

      // Serialize dates to ISO strings for JSON response
      const serializedResult = {
        principal: result.principal,
        environment: result.environment,
        destinationId: result.destinationId,
        enabled: result.enabled,
        createdBy: result.createdBy,
        createdOn: result.createdOn?.toISOString() || null,
        updatedBy: result.updatedBy,
        updatedOn: result.updatedOn?.toISOString() || null,
        validatedOn: result.validatedOn?.toISOString() || null,
      }

      return res.status(200).json(serializedResult)
    } catch (error) {
      logger.error('Failed to upsert allowed user', {
        errorMessage: error?.message || 'Unknown error',
        errorType: error?.name || 'Unknown',
        stack: error?.stack || 'No stack trace',
        operation: 'upsertAllowedUser',
        httpMethod: req.method,
        endpoint: req.url,
        errorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      })

      return res.status(500).json({
        error: 'Failed to upsert allowed user',
        message: error?.message || 'Unknown error',
      })
    }
  } else {
    logger.info('Received unsupported HTTP method')

    return res.status(405).json({
      error: `The HTTP ${req.method} method is not supported at this route.`,
    })
  }
}

export default withMiddleware('captureErrors')(handler)
