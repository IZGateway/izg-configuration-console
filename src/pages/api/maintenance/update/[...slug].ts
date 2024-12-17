import type { NextApiRequest, NextApiResponse } from 'next'
import _ from 'lodash'
import withMiddleware from '../../api-middleware-helper'
import dbInterface from '../../../../lib/db/ConfigConsoleRepository'
//import maintenanceRequest from '../../../../lib/queries/mutate/maintenanceRequest'
import logger from '../../../../../logger'

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
    const result = await dbInterface.maintenanceRequest(
      destId,
      destTypeId,
      maintData
    )
    res.json(result)
    if (maintData.startDateTime === null) {
      logger.info(
        'Cancelled maintenance request for ' +
          destId +
          ' on ' +
          maintData.destType +
          ' environment'
      )
    } else {
      logger.info(
        'Created maintenance request for ' +
          destId +
          ' on ' +
          maintData.destType +
          ' environment'
      )
    }
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}
export default withMiddleware()(handler)
