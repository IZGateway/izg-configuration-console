import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import withMiddleware from '../../api-middleware-helper'
import _ from 'lodash'
import logger from '../../../../../logger'
import { dbClient } from '../../../../lib/utils/dbclient'
/**
 * @swagger
 * /api/deploy/destination/{destTypeId}/{destId}:
 *   post:
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             username: string
 *             facilityId: string
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
  const { slug } = req.query
  const destId = slug[1]
  const destTypeId = _.toNumber(slug[0])
  const session = await getServerSession(req, res, authOptions)
  if (session.user.isAdmin) {
    if (req.method === 'POST') {
      const data = JSON.parse(req.body)
      const oldValues = await dbClient.fetchDestinationByIdAndType(
        destId,
        destTypeId
      )
      const isPasswordDifferent = await dbClient.isPasswordChangedForIdAndType(
        destId,
        destTypeId
      )
      const result = await dbClient.updatedAuditedDestination(
        destId,
        destTypeId,
        data,
        session.user.name,
        oldValues,
        isPasswordDifferent
      )
      res.json(result)
      if (res.statusCode === 200) {
        const passwordChanged = isPasswordDifferent

        logger.info(
          'Changes for ' +
            oldValues.jurisdiction.description +
            ' endpoint ' +
            oldValues.destUri +
            ' deployed by ' +
            session.user.name,
          {
            userName: session.user.name,
            oldValues: oldValues,
            newValues: data,
            passwordChanged: passwordChanged,
            createdAt: new Date(),
          }
        )
        await dbClient.deleteChangeRequest(destId, destTypeId)
      }
    } else {
      throw new Error(
        `The HTTP ${req.method} method is not supported at this route.`
      )
    }
  }
}

export default withMiddleware()(handler)
