import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import hasAccessToDestId from '../../../lib/accesshelper'
import destination from '../../../lib/queries/fetch/destination'
import destinationType from '../../../lib/queries/fetch/destinationtype'
import desttypehelper from '../../../lib/desttypehelper'
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
 *     responses:
 *       200:
 *         description: OK.
 */
export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const destId = req.query.id.toString()

  const session = await getServerSession(req, res, authOptions)

  const destType = desttypehelper.destTypeFormattedToSyncWithDB(
    req.query.destType.toString()
  )
  if (hasAccessToDestId(destId, session)) {
    if (req.method === 'GET') {
      const destination_type = await destinationType(destType)

      const result = await destination(destId, destination_type.type_id)
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
