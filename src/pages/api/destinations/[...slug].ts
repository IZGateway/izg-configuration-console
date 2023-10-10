import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import hasAccessToDestId from '../../../lib/accesshelper'
import destination from '../../../lib/queries/fetch/destination'
import _ from 'lodash'
/**
 * @swagger
 * /api/destinations/{id}:
 *   get:
 *     summary: Get destination information by ID.
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
      const result = await destination(destId, destTypeId)
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
