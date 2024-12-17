import type { NextApiRequest, NextApiResponse } from 'next'
import _ from 'lodash'
import withMiddleware from '../../api-middleware-helper'
import dbInterface from '../../../../lib/db/ConfigConsoleRepository'
// import cancelChangeRequest from '../../../../lib/queries/mutate/cancelChangeRequest'
// import destinationChangeRequest from '../../../../lib/queries/fetch/destinationchangerequest'
import changeRequestTicketComment from '../../../../lib/changerequestticketcomment'
/**
 * @swagger
 * /api/changerequest/cancel/{destTypeId}/{destId}:
 *   delete:
 *     summary: Update scheduled date and time for destination change request
 *       - name: destId
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
  const destId = slug[1]
  const destTypeId = _.toNumber(slug[0])
  const body = JSON.parse(req.body)
  if (req.method === 'POST') {
    try {
      const changeRequest = await dbInterface.destinationChangeRequest(
        destId,
        destTypeId
      )
      await changeRequestTicketComment(changeRequest.jira_id, body.requestedAt)
      await dbInterface.cancelChangeRequest(destId, destTypeId)
      res.status(200).json('Change Request is cancelled')
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Unable to cancel Change request' })
    }
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}
export default withMiddleware()(handler)
