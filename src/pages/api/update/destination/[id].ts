import type { NextApiRequest, NextApiResponse } from 'next'
import updatedAuditedDestination from '../../../../lib/queries/mutate/destination'
import desttypehelper from '../../../../lib/desttypehelper'
import destinationType from '../../../../lib/queries/fetch/destinationtype'
import withMiddleware from '../../api-middleware-helper'
/**
 * @swagger
 * /api/update/destination/{id}:
 *   post:
 *     summary: Update destination information by ID.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the destination.
 *       - name: destType
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: The type of the destination. Accepted Values (Development,Production,Staging,Onboarding,Testing,UNKNOWN)
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
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const destId = req.query.id.toString()
  const destType = desttypehelper.destTypeFormattedToSyncWithDB(
    req.query.destType.toString()
  )

  const destination_type = await destinationType(destType)
  if (req.method === 'POST') {
    const data = JSON.parse(req.body)
    const result = await updatedAuditedDestination(
      destId,
      destination_type?.type_id,
      data.updatedData,
      data.user,
      data.oldValues,
      data.newValues,
      data.tableName
    )
    res.json(result)
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}

export default withMiddleware('checkAccessToDestId')(handler)
