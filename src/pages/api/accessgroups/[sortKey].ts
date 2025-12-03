import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import type {
  AccessGroupResponse,
  DeleteAccessGroupResponse,
  ErrorResponse,
} from '../../../lib/type/AccessGroupApi'
import { isUpdateAccessGroupRequest } from '../../../lib/validators/accessgroupvalidators'

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<
    AccessGroupResponse | DeleteAccessGroupResponse | ErrorResponse
  >
) => {
  // Check authentication
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user) {
    res.status(401).json({ error: 'Unauthorized - Please login' })
    return
  }

  const { sortKey } = req.query

  if (typeof sortKey !== 'string') {
    res.status(400).json({ error: 'Invalid sortKey parameter' })
    return
  }

  if (req.method === 'PUT') {
    try {
      // Type-safe validation using type guard
      if (!isUpdateAccessGroupRequest(req.body)) {
        res.status(400).json({
          error:
            'Invalid request: groupName must be non-empty string (max 100 chars). ' +
            'roles, users, and groups must be arrays of strings if provided.',
        })
        return
      }

      logger.info('Updating access group', {
        sortKey,
        updateData: JSON.stringify(req.body),
        user: session.user.email,
      })

      const dbClient = await DbClientFactory.getDbClient()
      const result = await dbClient.updateAccessGroup(sortKey, req.body)

      if (result) {
        res.json(result)
      } else {
        logger.error('Database update failed for access group', {
          operation: 'updateAccessGroup',
          httpMethod: req.method,
          sortKey,
          user: session.user.email,
        })
        res.status(500).json({ error: 'Failed to update access group' })
      }
    } catch (error) {
      logger.error('Error updating access group', {
        operation: 'updateAccessGroup',
        httpMethod: req.method,
        sortKey,
        user: session.user.email,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
      })

      const statusCode = error.message.includes('not found') ? 404 : 500
      const errorMessage = error.message.includes('not found')
        ? error.message
        : 'Internal server error'
      res.status(statusCode).json({ error: errorMessage })
    }
  } else if (req.method === 'DELETE') {
    try {
      logger.info('Deleting access group', {
        sortKey,
        user: session.user.email,
      })

      const dbClient = await DbClientFactory.getDbClient()
      const result = await dbClient.deleteAccessGroup(sortKey)

      if (result) {
        res.status(200).json({ message: 'Access group deleted successfully' })
      } else {
        logger.error('Database delete failed for access group', {
          operation: 'deleteAccessGroup',
          httpMethod: req.method,
          sortKey,
          user: session.user.email,
        })
        res.status(500).json({ error: 'Failed to delete access group' })
      }
    } catch (error) {
      logger.error('Error deleting access group', {
        operation: 'deleteAccessGroup',
        httpMethod: req.method,
        sortKey,
        user: session.user.email,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
      })

      const statusCode = error.message.includes('not found') ? 404 : 500
      const errorMessage = error.message.includes('not found')
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
