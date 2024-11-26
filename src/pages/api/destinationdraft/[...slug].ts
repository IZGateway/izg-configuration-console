import type { NextApiRequest, NextApiResponse } from 'next'
import _ from 'lodash'
import withMiddleware from '../api-middleware-helper'
import dbInterface from '../../../lib/dbInterface'
// import fetchDraftRecord from '../../../lib/queries/fetch/draftrecord'
/**
 * @swagger
 * /api/destinationdraft/{destTypeId}/{destId}:
 *   get:
 *     summary: Get destination draft information for a destination id for a given destination type id
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
    const result = await dbInterface.fetchDraftRecord(destId, destTypeId)
    res.json(result)
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}
export default withMiddleware('checkAccessToDestIdSlug')(handler)
