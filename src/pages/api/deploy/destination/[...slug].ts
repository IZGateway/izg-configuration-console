import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import updatedAuditedDestination from '../../../../lib/queries/mutate/destination'
import withMiddleware from '../../api-middleware-helper'
import _ from 'lodash'
import destination from '../../../../lib/queries/fetch/destination'
import { deleteDestinationChangeRequest } from '../../../../lib/queries/mutate/destinationchangerequest'
/**
 * @swagger
 * /api/deploy/destination/{destTypeId}/{destId}:
 *   post:
 *     summary: Get connection test results for destination by ID.
 *     parameters:
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             username: string
 *             facility_id: string
 *             MSH3: string
 *             MSH4: string
 *             MSH5: string
 *             MSH6: string
 *             MSH22: string
 *             RXA11: string
 *     responses:
 *       200:
 *         description: destination successfully updated.
 *         content:
 *           application/json:
 *       400:
 *         description: Bad request.
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { slug } = req.query
  const destId = slug[1]
  const destTypeId = _.toNumber(slug[0])
  const session = await getServerSession(req, res, authOptions)
  if (session.isAdmin) {
    if (req.method === 'POST') {
      const data = JSON.parse(req.body)
      const oldValues = await destination(destId, destTypeId)
      const result = await updatedAuditedDestination(
        destId,
        destTypeId,
        data,
        session.user.name,
        oldValues
      )
      res.json(result)
      if (res.statusCode === 200) {
        await deleteDestinationChangeRequest(data.id)
      }
    } else {
      throw new Error(
        `The HTTP ${req.method} method is not supported at this route.`
      )
    }
  }
}

export default withMiddleware()(handler)
