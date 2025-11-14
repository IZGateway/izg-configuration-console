import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const dbClient = await DbClientFactory.getDbClient()
      const result = await dbClient.fetchDenyListData()

      if (!result) {
        logger.error('No deny list data returned from database', {
          operation: 'fetchDenyListData',
          httpMethod: req.method,
        })
        return res.status(500).json({ error: 'Failed to fetch deny list data' })
      }

      return res.status(200).json(result)
    } catch (error) {
      logger.error('Error fetching deny list data', {
        operation: 'fetchDenyListData',
        httpMethod: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'POST') {
    const { certificationName, environment, reason, deniedBy } = req.body

    try {
      if (!certificationName || !environment) {
        return res.status(400).json({
          error: 'Certificate name and environment are required fields',
        })
      }

      const dbClient = await DbClientFactory.getDbClient()
      const newRecord = await dbClient.addDenyListRecord({
        principal: certificationName,
        environment,
        reason,
        deniedBy,
      })

      return res.status(201).json(newRecord)
    } catch (error) {
      logger.error('Error adding deny list record', {
        operation: 'addDenyListRecord',
        httpMethod: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })

      if (
        error instanceof Error &&
        error.name === 'ConditionalCheckFailedException'
      ) {
        res.setHeader('Content-Type', 'application/json')
        return res.status(409).json({
          error:
            error.message ||
            `A deny list entry already exists for certificate "${certificationName}" in environment "${environment}". Please use a different certificate name or environment.`,
        })
      }

      res.setHeader('Content-Type', 'application/json')
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])

  return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
}

export default withMiddleware()(handler)
