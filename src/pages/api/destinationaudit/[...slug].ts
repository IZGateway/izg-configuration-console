import type { NextApiRequest, NextApiResponse } from 'next'
import dbInterface from '../../../../lib/dbInterface'
// import destinationaudithistory from '../../../lib/queries/fetch/destinationaudithistory'
import _ from 'lodash'
import withMiddleware from '../api-middleware-helper'

/**
 * @swagger
 * /api/destinationaudit/{destTypeId}/{destId}:
 *   get:
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
 *     responses:
 *       200:
 *         description: OK.
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { slug } = req.query
  const destId = slug[1]
  const destTypeId = _.toNumber(slug[0])

  if (req.method === 'GET') {
    const result = await dbInterface.destinationaudithistory(destId, destTypeId)
    res.json(result)
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}
export default withMiddleware('checkAccessToDestIdSlug')(handler)
