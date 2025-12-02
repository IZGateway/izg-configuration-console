import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const dbClient = await DbClientFactory.getDbClient()
    const result = await dbClient.fetchAccessGroups()
    if (result) {
      res.json(result)
    } else {
      logger.error('Database lookup failed for access groups', {
        operation: 'fetchAccessGroups',
        httpMethod: req.method,
      })
      res.status(500)
    }
  } else if (req.method === 'POST') {
    try {
      const accessGroupData = req.body

      // Validate required fields
      if (!accessGroupData.environment || !accessGroupData.groupName) {
        res.status(400).json({
          error: 'environment and groupName are required fields',
        })
        return
      }

      const dbClient = await DbClientFactory.getDbClient()
      const result = await dbClient.addAccessGroup(accessGroupData)

      if (result) {
        res.status(201).json(result)
      } else {
        logger.error('Database insert failed for access group', {
          operation: 'addAccessGroup',
          httpMethod: req.method,
        })
        res.status(500).json({ error: 'Failed to create access group' })
      }
    } catch (error) {
      logger.error('Error creating access group', {
        operation: 'addAccessGroup',
        httpMethod: req.method,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
      })

      if (error.message.includes('already exists')) {
        res.status(409).json({ error: error.message })
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
