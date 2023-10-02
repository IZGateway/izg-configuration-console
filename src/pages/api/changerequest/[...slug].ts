import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import hasAccessToDestId from '../../../lib/accesshelper'
import _ from 'lodash'
import destinationChangeRequest from '../../../lib/queries/fetch/destinationchangerequest'
/**
 * @swagger
 * /api/changerequest/{destTypeId}/{destId}:
 *   get:
 *     summary: Get destination change request for destination type and destination id.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the destination.
 *       - name: destType
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: The type of the destination. Accepted Values (Development,Production,Staging,Onboarding,Testing,UNKNOWN)
 *     responses:
 *       200:
 *         description: OK.
 */
export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug } = req.query
  const destId = slug[1]
  const destTypeId = _.toNumber(slug[0])
  const session = await getServerSession(req, res, authOptions)

  if (hasAccessToDestId(destId, session)) {
    if (req.method === 'GET') {
      const result = await destinationChangeRequest(destId, destTypeId)
      res.json(result)
    } else {
      throw new Error(
        `The HTTP ${req.method} method is not supported at this route.`
      )
    }
  } else {
    res.status(401)
  }
}
