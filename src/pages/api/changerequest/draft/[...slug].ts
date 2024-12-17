import type { NextApiRequest, NextApiResponse } from 'next'
import _ from 'lodash'
import withMiddleware from '../../api-middleware-helper'
import { dbClient } from '../../../../lib/utils/dbclient'
/**
 * @swagger
 * /api/changerequest/draft/{destTypeId}/{destId}/{draftID}:
 *   delete:
 *     summary: Delete destination saved draft for destination type, destination id, draftID.
 *       - name: destId
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
 *       - name: draftID
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *         description: The ID of destination draft
 *     responses:
 *       200:
 *         description: OK.
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { slug } = req.query
  const destId = slug[1]
  const destTypeId = _.toNumber(slug[0])
  const id = _.toNumber(slug[2])

  if (req.method === 'DELETE') {
    try {
      await dbClient.deleteDraftValues(id, destId, destTypeId)
      res.status(200).json('Draft was deleted')
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Internal Server Error' })
    }
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}
export default withMiddleware()(handler)
