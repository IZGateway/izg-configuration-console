import type { NextApiRequest, NextApiResponse } from 'next'
import destination from '../../../lib/queries/fetch/destination'
import _ from 'lodash'
import withMiddleware from '../api-middleware-helper'
/**
 * @swagger
 * /api/destinations/{destTypeId}/{destId}:
 *   get:
 *     summary: Get destination information for a destination id for a given destination type id
 *     parameters:
 *       - name: destTypeId
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *         description: The id of the destination type.
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The id of the destination.
 *     responses:
 *       200:
 *         description: OK.
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { slug } = req.query
  const destId = slug[1]
  const destTypeId = _.toNumber(slug[0])
  if (req.method === 'GET') {
    const result = await destination(destId, destTypeId)
    res.json(result)
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}
export default withMiddleware('checkAccessToDestIdSlug')(handler)
