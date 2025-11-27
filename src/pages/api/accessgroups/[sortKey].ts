import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { sortKey } = req.query

  if (typeof sortKey !== 'string') {
    res.status(400).json({ error: 'Invalid sortKey parameter' })
    return
  }

  if (req.method === 'PUT') {
    try {
      const updateData = req.body

      logger.info('Updating access group', {
        sortKey,
        updateData: JSON.stringify(updateData),
      })

      // Validate required fields
      if (updateData.roles !== undefined && !Array.isArray(updateData.roles)) {
        res.status(400).json({
          error: 'roles must be an array',
        })
        return
      }

      const dbClient = await DbClientFactory.getDbClient()
      const result = await dbClient.updateAccessGroup(sortKey, updateData)

      if (result) {
        res.json(result)
      } else {
        logger.error('Database update failed for access group', {
          operation: 'updateAccessGroup',
          httpMethod: req.method,
          sortKey,
        })
        res.status(500).json({ error: 'Failed to update access group' })
      }
    } catch (error) {
      logger.error('Error updating access group', {
        operation: 'updateAccessGroup',
        httpMethod: req.method,
        sortKey,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
      })

      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message })
      } else {
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  } else if (req.method === 'DELETE') {
    try {
      logger.info('Deleting access group', {
        sortKey,
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
        })
        res.status(500).json({ error: 'Failed to delete access group' })
      }
    } catch (error) {
      logger.error('Error deleting access group', {
        operation: 'deleteAccessGroup',
        httpMethod: req.method,
        sortKey,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
      })

      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message })
      } else {
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}

export default withMiddleware()(handler)
