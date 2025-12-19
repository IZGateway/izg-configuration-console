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
      const existingRecords = (await dbClient.fetchFileTypeList()) as Array<{
        sortKey: string
      }>
      const recordToDelete = existingRecords.find(
        (record) => record.sortKey === id
      )

      if (!recordToDelete) {
        return res.status(404).json({
          error: 'File type record not found',
        })
      }

      // Delete the record
      const success = await dbClient.deleteAdsFileTypeRecord(id)

      if (!success) {
        logger.error('Failed to delete file type record', {
          operation: 'deleteFileTypeRecord',
          recordId: id,
          httpMethod: req.method,
        })
        return res.status(500).json({
          error: 'Failed to delete file type record',
        })
      }

      logger.info('File type record deleted successfully', {
        operation: 'deleteAdsFileTypeRecord',
        recordId: id,
        deletedRecord: {
          sortKey: recordToDelete.sortKey,
        },
        httpMethod: req.method,
      })

      return res.status(200).json({
        message: 'File type record deleted successfully',
        deletedId: id,
      })
    } catch (error) {
      logger.error('Error deleting file type record', {
        operation: 'deleteAdsFileTypeRecord',
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
