import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import withMiddleware from '../../api-middleware-helper'
import _ from 'lodash'
import { Destination } from '../../../../lib/type/Destination'
import { DestinationChangeRequest } from '../../../../lib/type/DestinationChangeRequest'
import logger from '../../../../../logger'
import DbClientFactory from '../../../../lib/db/DbClientFactory'
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
  const dbClient = await DbClientFactory.getDbClient()

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

      // Fetch current destination from database to get complete record
      const currentDestination: Destination | null =
        await dbClient.fetchDestination(
          changeRequest.destId,
          changeRequest.destType.typeId
        )

      const updatedDestination: Destination = {
        destId: changeRequest.destId,
        destUri: changeRequest.requested.destUri,
        destVersion: currentDestination?.destVersion ?? undefined,
        username: changeRequest.requested.username,
        MSH6: changeRequest.requested.MSH6 ?? undefined,
        MSH11: changeRequest.requested.MSH11 ?? undefined,
        MSH22: changeRequest.requested.MSH22 ?? undefined,
        MSH3: changeRequest.requested.MSH3 ?? undefined,
        MSH4: changeRequest.requested.MSH4 ?? undefined,
        MSH5: changeRequest.requested.MSH5 ?? undefined,
        RXA11: changeRequest.requested.RXA11 ?? undefined,
        facilityId: changeRequest.requested.facilityId ?? undefined,
        passExpiry: currentDestination?.passExpiry ?? undefined,
        maintReason: currentDestination?.maintReason ?? undefined,
        maintStart: currentDestination?.maintStart ?? undefined,
        maintEnd: currentDestination?.maintEnd ?? undefined,
        createdBy: currentDestination?.createdBy ?? undefined,
        createdOn: currentDestination?.createdOn ?? undefined,
        updatedBy: currentDestination?.updatedBy ?? undefined,
        updatedOn: currentDestination?.updatedOn ?? undefined,
        jurisdiction: {
          jurisdictionId: changeRequest.jurisdiction.jurisdictionId,
          name: currentDestination?.jurisdiction?.name ?? undefined,
          description:
            currentDestination?.jurisdiction?.description ?? undefined,
          createdBy: currentDestination?.jurisdiction?.createdBy ?? undefined,
          createdOn: currentDestination?.jurisdiction?.createdOn ?? undefined,
          updatedBy: currentDestination?.jurisdiction?.updatedBy ?? undefined,
          updatedOn: currentDestination?.jurisdiction?.updatedOn ?? undefined,
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
        dbClient.updateDestination(updatedDestination), // Log updator info
        dbClient.createDestinationChangeRequestDeploymentAudit(
          changeRequest,
          session.user.name
        ), // log creator info
        dbClient.deleteDestinationChangeRequest(changeRequestId), // log deleter info
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
          logger.info(
            'Changes for ' +
              changeRequest.destId +
              ' endpoint ' +
              changeRequest.destType.type +
              ' deployed by ' +
              session.user.name,
            {
              userName: session.user.name,
              destId: changeRequest.destId,
              destinationType: changeRequest.destType.type,
              oldValues: {
                destUri: currentDestination?.destUri,
                username: currentDestination?.username,
                MSH3: currentDestination?.MSH3,
                MSH4: currentDestination?.MSH4,
                MSH5: currentDestination?.MSH5,
                MSH6: currentDestination?.MSH6,
                MSH11: currentDestination?.MSH11,
                MSH22: currentDestination?.MSH22,
                RXA11: currentDestination?.RXA11,
                facilityId: currentDestination?.facilityId,
                password: currentDestination?.password ? '********' : undefined,
              },
              newValues: {
                destUri: changeRequest.requested.destUri,
                username: changeRequest.requested.username,
                MSH3: changeRequest.requested.MSH3,
                MSH4: changeRequest.requested.MSH4,
                MSH5: changeRequest.requested.MSH5,
                MSH6: changeRequest.requested.MSH6,
                MSH11: changeRequest.requested.MSH11,
                MSH22: changeRequest.requested.MSH22,
                RXA11: changeRequest.requested.RXA11,
                facilityId: changeRequest.requested.facilityId,
                password: updatedDestination.password ? '********' : undefined,
              },
              passwordChanged: changeRequest.isPasswordDifferent,
              createdAt: new Date(),
            }
          )
        } else {
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
        }
      })
    }
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}

export default withMiddleware()(handler)
