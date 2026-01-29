import type { NextApiRequest, NextApiResponse } from 'next'
import _ from 'lodash'
import withMiddleware from '../../api-middleware-helper'
import DbClientFactory from '../../../../lib/db/DbClientFactory'

/**
 * @swagger
 * /api/maintenance/update/{destTypeId}/{destId}:
 *   delete:
 *     summary: Update maintenance start date, end date, reason for connection maintenance
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
 *     responses:
 *       200:
 *         description: OK.
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { slug } = req.query
  const destId = slug[1]
  const destTypeId = _.toNumber(slug[0])
  const maintData = req.body
  if (req.method === 'POST') {
    const dbClient = await DbClientFactory.getDbClient()
    const result = await dbClient.updateDestination({
      destId: destId,
      destinationType: {
        typeId: destTypeId,
      },
      destUri: undefined,
      username: undefined,
      MSH3: undefined,
      MSH4: undefined,
      MSH5: undefined,
      RXA11: undefined,
      facilityId: undefined,
      MSH6: undefined,
      MSH11: undefined,
      MSH22: undefined,
      maintReason: maintData.message,
      maintEnd: maintData.reinstatementDateTime
        ? maintData.reinstatementDateTime
        : null,
      maintStart: maintData.startDateTime ? maintData.startDateTime : null,
      createdBy: undefined,
      createdOn: undefined,
      updatedBy: undefined,
      updatedOn: undefined,
    })
    res.json(result)
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}
export default withMiddleware()(handler)
