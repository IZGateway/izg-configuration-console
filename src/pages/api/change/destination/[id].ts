import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import hasAccessToDestId from '../../../../lib/accesshelper'
import destinationChangeLog from '../../../../lib/queries/change/destination'
import withMiddleware from '../../api-middleware-helper'
/**
 * @swagger
 * /api/change/destination/{id}:
 *   post:
 *     summary: Schedule change in destination information by ID.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the destination.
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
 *         description: destination successfully scheduled to change upon approval.
 *         content:
 *           application/json:
 *       400:
 *         description: Bad request.
 */

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const destId = req.query.id.toString()
  // const session = await getServerSession(req, res, authOptions)

  // if (hasAccessToDestId(destId, session)) {
  if (req.method === 'POST') {
    const data = JSON.parse(req.body)
    const result = await destinationChangeLog(data)
    res.json(result)
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
  // } else {
  // res.status(401)
  //}
}
export default withMiddleware('checkAccessToDestId')(handler)
