import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import hasAccessToDestId from '../../../lib/accesshelper'
import destination from '../../../lib/queries/update/destination'
/**
 * @swagger
 * /api/update/{id}:
 *   post:
 *     summary: Update destination information by ID.
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
 *         description: destination successfully updated.
 *         content:
 *           application/json:
 *       400:
 *         description: Bad request.
 */

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const destId = req.query.id.toString()
  const session = await getServerSession(req, res, authOptions)

  if (hasAccessToDestId(destId, session)) {
    if (req.method === 'POST') {
      try {
        const body = req.body
        const result = await destination(destId, body)
        res.status(200).json(result)
      } catch (error) {
        throw new Error(`Failed to update data`)
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' })
    }
  } else {
    res.status(401)
  }
}
