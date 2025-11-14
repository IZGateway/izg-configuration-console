// API endpoint: /api/deny-list/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query

      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          error: 'Invalid or missing ID parameter',
        })
      }

      const dbClient = await DbClientFactory.getDbClient()

      // First, check if the record exists
      const existingRecords = await dbClient.fetchDenyListData()
      const recordToDelete = existingRecords.find((record) => record.id === id)

      if (!recordToDelete) {
        return res.status(404).json({
          error: 'Deny list record not found',
        })
      }

      // Delete the record
      const success = await dbClient.deleteDenyListRecord(id)

      if (!success) {
        logger.error('Failed to delete deny list record', {
          operation: 'deleteDenyListRecord',
          recordId: id,
          httpMethod: req.method,
        })
        return res.status(500).json({
          error: 'Failed to delete deny list record',
        })
      }

      logger.info('Deny list record deleted successfully', {
        operation: 'deleteDenyListRecord',
        recordId: id,
        deletedRecord: {
          certificationName: recordToDelete.certificationName,
          environment: recordToDelete.environment,
        },
        httpMethod: req.method,
      })

      return res.status(200).json({
        message: 'Deny list record deleted successfully',
        deletedId: id,
      })
    } catch (error) {
      logger.error('Error deleting deny list record', {
        operation: 'deleteDenyListRecord',
        httpMethod: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        recordId: req.query.id,
      })

      return res.status(500).json({
        error: 'Internal server error',
      })
    }
  }

  res.setHeader('Allow', ['DELETE'])
  return res.status(405).json({
    error: `Method ${req.method} Not Allowed`,
  })
}

export default withMiddleware()(handler)
