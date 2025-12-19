import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import type {
  AccessGroupResponse,
  ErrorResponse,
} from '../../../lib/type/AccessGroupApi'
import { isCreateAccessGroupRequest } from '../../../lib/validators/accessgroupvalidators'

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<
    AccessGroupResponse | AccessGroupResponse[] | ErrorResponse
  >
) => {
  // Check authentication
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user) {
    res.status(401).json({ error: 'Unauthorized - Please login' })
    return
  }

  if (req.method === 'GET') {
    const dbClient = await DbClientFactory.getDbClient()
    const result = await dbClient.fetchAccessGroups()
    if (result) {
      res.json(result)
    } else {
      logger.error('Database lookup failed for access groups', {
        operation: 'fetchAccessGroups',
        httpMethod: req.method,
        user: session.user.email,
      })
      res.status(500)
    }
  } else if (req.method === 'POST') {
    try {
      // Type-safe validation using type guard
      if (!isCreateAccessGroupRequest(req.body)) {
        res.status(400).json({
          error:
            'Invalid request: environment (1-5) and groupName (max 100 chars) are required. ' +
            'roles, users, and groups must be arrays of strings if provided.',
        })
        return
      }

      const dbClient = await DbClientFactory.getDbClient()
      const result = await dbClient.addAccessGroup({
        ...req.body,
        environment: String(req.body.environment),
        createdBy: session.user.email || 'System',
      })  

      if (result) {
        res.status(201).json(result)
      } else {
        logger.error('Database insert failed for access group', {
          operation: 'addAccessGroup',
          httpMethod: req.method,
          user: session.user.email,
        })
        res.status(500).json({ error: 'Failed to create access group' })
      }
    } catch (error) {
      logger.error('Error creating access group', {
        operation: 'addAccessGroup',
        httpMethod: req.method,
        user: session.user.email,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
      })

      const statusCode = error.message.includes('already exists') ? 409 : 500
      const errorMessage = error.message.includes('already exists')
        ? error.message
        : 'Internal server error'
      res.status(statusCode).json({ error: errorMessage })
    }
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}
export default withMiddleware()(handler)
