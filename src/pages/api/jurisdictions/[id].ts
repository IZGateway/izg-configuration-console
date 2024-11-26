import type { NextApiRequest, NextApiResponse } from 'next'
import dbInterface from '../../../../lib/dbInterface'
// import jurisdiction from '../../../lib/queries/fetch/jurisdiction'
import withMiddleware from '../api-middleware-helper'
/**
 * @swagger
 * /api/jurisdictions/{id}:
 *   get:
 *     summary: Get destination's juridiction data by ID.
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
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const destId = req.query.id.toString()

  if (req.method === 'GET') {
    const result = await dbInterface.jurisdiction(destId)
    res.json(result)
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}
export default withMiddleware('checkAccessToDestId')(handler)
