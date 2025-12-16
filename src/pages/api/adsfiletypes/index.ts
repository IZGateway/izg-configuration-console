import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const dbClient = await DbClientFactory.getDbClient()
      const result = await dbClient.fetchFileTypeList()

      if (!result) {
        logger.error('No ads file types data returned from database', {
          operation: 'fetchFileTypeList',
          httpMethod: req.method,
        })
        return res.status(500).json({ error: 'Failed to fetch ads file types' })
      }

      return res.status(200).json(result)
    } catch (error) {
      logger.error('Error fetching ads file types', {
        operation: 'fetchFileTypeList',
        httpMethod: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'POST') {
    const { description, fileTypeName, sortKey, createdBy } = req.body

    try {
      const dbClient = await DbClientFactory.getDbClient()
      const newRecord = await dbClient.addAdsFileTypeRecord({
        description,
        fileTypeName,
        sortKey,
        createdBy,
      })  // TODO: Log creator info

      return res.status(201).json(newRecord)
    } catch (error) {
      logger.error('Error adding ads file type record', {
        operation: 'addAdsFileTypeRecord',
        httpMethod: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })

      // Handle duplicate file type error
      if (error?.name === 'ConditionalCheckFailedException') {
        res.setHeader('Content-Type', 'application/json')
        return res.status(409).json({
          error: 'File type already exists',
          message: 'A file type with this name already exists in the system.',
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
