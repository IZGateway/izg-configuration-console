import type { NextApiRequest, NextApiResponse } from 'next'
import _ from 'lodash'
import withMiddleware from '../api-middleware-helper'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import changeRequestTicketComment from '../../../lib/changerequestticketcomment'
import logger from '../../../../logger'
import hasAccessToDestId from '../../../lib/accesshelper'
import { asyncRequestContext } from '../../../lib/Context'
/**
 * @swagger
 * /api/changerequest/{destTypeId}/{destId}:
 *   get:
 *     summary: Get destination change request for destination type and destination id.
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the destination.
 *       - name: destTypeId
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *         description: The ID of destination type
 *     responses:
 *       200:
 *         description: OK.
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { slug } = req.query
  const context = asyncRequestContext.getStore()
  const session = context?.session

  if (!session?.user) {
    return res.status(401).send('unauthorized')
  }

  const dbClient = await DbClientFactory.getDbClient()
  if (req.method === 'GET') {
    const destId = slug[1]
    const destTypeId = _.toNumber(slug[0])

    if (!hasAccessToDestId(destId, session)) {
      return res.status(401).send('unauthorized')
    }

    const result =
      await dbClient.fetchDestinationChangeRequestByDestIdAndDestType(
        destId,
        destTypeId
      )
    res.json(result)
  } else if (req.method === 'DELETE') {
    const id = _.toNumber(slug[0])
    try {
      const changeRequest = await dbClient.fetchDestinationChangeRequestById(id)

      if (!changeRequest || !hasAccessToDestId(changeRequest.destId, session)) {
        return res.status(401).send('unauthorized')
      }

      if (!changeRequest.isDraft) {
        await changeRequestTicketComment(changeRequest.jiraId, new Date())
      }
      await dbClient.deleteDestinationChangeRequest(id)
      logger.info(`Change Request with ID ${id} is deleted by user`)
      res.status(200).json('Change Request is deleted')
    } catch (error) {
      logger.error('Failed to delete change request by user', {
        changeRequestId: id,
        timestamp: new Date().toISOString(),
        operation: 'delete_change_request',
        errorMessage: error.message,
        errorType: error.name,
      })
      res.status(500).json({ error: 'Unable to delete Change request' })
    }
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}
export default withMiddleware('captureErrors')(handler)
