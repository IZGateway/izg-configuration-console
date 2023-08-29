import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import hasAccessToDestId from '../../../lib/accesshelper'
import destinationaudithistory from '../../../lib/queries/fetch/destinationaudithistory'
/**
 * @swagger
 * /api/destinationaudit/{id}:
 *   get:
 *     summary: Get audit in change in destination by ID.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the destination.
 *     responses:
 *       200:
 *         description: OK.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const destId = req.query.id.toString()
  const session = await getServerSession(req, res, authOptions)

  if (hasAccessToDestId(destId, session)) {
    if (req.method === 'GET') {
      const result = await destinationaudithistory(destId, session.user.name)
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
