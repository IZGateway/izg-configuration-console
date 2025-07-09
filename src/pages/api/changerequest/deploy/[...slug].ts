import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import withMiddleware from '../../api-middleware-helper'
import _ from 'lodash'
import { dbClient } from '../../../../lib/utils/dbclient'
import { Destination } from '../../../../lib/type/Destination'
import { DestinationChangeRequest } from '../../../../lib/type/DestinationChangeRequest'
import logger from '../../../../../logger'
/**
 * @swagger
 * /api/changerequest/deploye/{id}:
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
  const changeRequestId = _.toNumber(slug[0])
  const errorMessages = []

  if (req.method === 'GET') {
    const session = await getServerSession(req, res, authOptions)
    if (session.user.isAdmin) {
      let changeRequestPassword = null
      let currentPassword = null
      const changeRequest: DestinationChangeRequest =
        await dbClient.fetchDestinationChangeRequestById(changeRequestId)

      if (changeRequest.isPasswordDifferent) {
        changeRequestPassword = await dbClient.fetchChangeRequestPassword(
          changeRequestId
        )
        currentPassword = await dbClient.fetchDestinationPassword(
          changeRequest.destId,
          changeRequest.destType.typeId
        )
        if (changeRequestPassword && currentPassword) {
          changeRequest.requested.password = changeRequestPassword
          changeRequest.current.password = currentPassword
        } else {
          res
            .status(500)
            .json(
              `Change request id ${changeRequestId} password or current password not found`
            )
        }
      }

      const updatedDestination: Destination = {
        destId: changeRequest.destId,
        destUri: changeRequest.requested.destUri,
        destVersion: undefined,
        username: changeRequest.requested.username,
        MSH6: changeRequest.requested.MSH6 || undefined,
        MSH22: changeRequest.requested.MSH22 || undefined,
        MSH3: changeRequest.requested.MSH3 || undefined,
        MSH4: changeRequest.requested.MSH4 || undefined,
        MSH5: changeRequest.requested.MSH5 || undefined,
        RXA11: changeRequest.requested.RXA11 || undefined,
        facilityId: changeRequest.requested.facilityId || undefined,
        passExpiry: undefined,
        maintReason: undefined,
        maintStart: undefined,
        maintEnd: undefined,
        jurisdiction: {
          jurisdictionId: changeRequest.jurisdiction.jurisdictionId,
          name: undefined,
          description: undefined,
        },
        destinationType: {
          type: changeRequest.destType.type,
          typeId: changeRequest.destType.typeId,
        },
        password: changeRequest.isPasswordDifferent
          ? changeRequestPassword
          : undefined,
      }

      Promise.allSettled([
        await dbClient.updateDestination(updatedDestination),
        await dbClient.createDestinationChangeRequestDeploymentAudit(
          changeRequest,
          session.user.name
        ),
        await dbClient.deleteDestinationChangeRequest(changeRequestId),
      ]).then((results) => {
        enum calls {
          updateDestination = 0,
          createDestinationChangeRequestDeploymentAudit = 1,
          deleteDestinationChangeRequest = 2,
        }
        if (results.every((result) => result.status === 'fulfilled')) {
          logger.info(
            `Jira change request ${changeRequest.jiraId} deployed successfully`
          )
          res.status(200).json('update successful')
        }
        logger.info(
          `Jira change request ${changeRequest.jiraId} deployment error(s) detected...`
        )
        results.map((result, index) => {
          let errorMessage = ''
          if (result.status === 'rejected') {
            errorMessage = `Error deploying Jira change request ${changeRequest.jiraId} on ${calls[index]}:  ${result.reason}`
            logger.info(errorMessage)
            errorMessages.push(errorMessage)
          } else {
            errorMessages.push(`${calls[index]} was successful`)
          }
        })
        res.status(500).json({
          message: `All or some of the change request deploymen failed for ${changeRequest.jiraId}. Inspect the error messages for more details.`,
          errorMessages,
        })
      })
    }
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}

export default withMiddleware()(handler)
