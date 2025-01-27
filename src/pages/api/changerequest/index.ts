import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import hasAccessToDestId from '../../../lib/accesshelper'
import _ from 'lodash'
import createChangeRequestTicket from '../../../lib/createchangerequestticket'
import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'
import { dbClient } from '../../../lib/utils/dbclient'
import { DestinationChangeRequest } from '../../../lib/type/DestinationChangeRequest'
import changeRequestTicketComment from '../../../lib/changerequestticketcomment'
/**
 * @swagger
 * /api/changerequest:
 *   post:
 *     summary: Schedule change in destination information by ID.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the destination.
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
 *         description: destination successfully scheduled to change upon approval.
 *         content:
 *           application/json:
 *       400:
 *         description: Bad request.
 */
const JIRA_API_URL = process.env.JIRA_API_URL || undefined
const JIRA_API_ISSUE_TYPE = process.env.JIRA_API_ISSUE_TYPE || undefined
const JIRA_API_PROJECT_ID = process.env.JIRA_API_PROJECT_ID || undefined
const JIRA_API_AUTH_BASE64 = process.env.JIRA_API_AUTH_BASE64 || undefined

const isJiraConfigured = () => {
  if (
    JIRA_API_AUTH_BASE64 &&
    JIRA_API_ISSUE_TYPE &&
    JIRA_API_PROJECT_ID &&
    JIRA_API_URL
  )
    return true
  return false
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const requestBody = JSON.parse(req.body)
  const session = await getServerSession(req, res, authOptions)

  if (!isJiraConfigured) {
    throw new Error(
      'Jira connection is not configured correctly. Ensure the necessary variables have been configured for the environment.'
    )
  }
  if (hasAccessToDestId(requestBody.destId, session)) {
    const { isDraft } = requestBody
    if (req.method === 'POST') {
      if (isDraft === true) {
        const draft = await upsertChangeRequest(requestBody)
        if (draft) {
          logger.info(
            'Draft was saved successfully for ' + requestBody.dest_uri
          )
          res.status(200)
          res.json(draft)
        } else {
          res.status(500)
          res.json('Error saving draft.')
        }
      } else {
        let changeRequestTicketResponse = null
        let changeRequestDBResponse = null
        try {
          changeRequestTicketResponse = await createChangeRequestTicket({
            ...requestBody,
          })
          if (changeRequestTicketResponse) {
            changeRequestDBResponse = await upsertChangeRequest({
              ...requestBody,
              jiraId: changeRequestTicketResponse.key,
            })
          }
          res.status(200).json('Change request ticket created successfully.')
        } catch (error) {
          throw new Error(
            `Error creating change request ticket for ${requestBody.dest_id} on environment ${requestBody.dest_type_id} : ${error}`
          )
        } finally {
          if (_.isNull(changeRequestTicketResponse)) {
            await dbClient.deleteDestinationChangeRequest(
              changeRequestDBResponse.id
            )
          }
        }
      }
    } else if (req.method === 'PUT') {
      const { scheduleupdate } = req.query
      if (scheduleupdate) {
        try {
          await changeRequestTicketComment(
            requestBody.jiraId,
            requestBody.requestedAt,
            requestBody.scheduledAt,
            requestBody.isAsap
          )

          await dbClient.updateDestinationChangeRequestDeploymentTime(
            requestBody.id,
            new Date(),
            new Date(requestBody.scheduledAt)
          )
          res.status(200).json('Change Request is updated')
        } catch (error) {
          console.error(error)
          res.status(500).json({ error: 'Unable to update Change request' })
        }
      } else {
        try {
          await dbClient.upsertDestinationChangeRequest(requestBody)
          res.status(200).json('Change Request is updated')
        } catch (error) {
          console.error(error)
          res.status(500).json({ error: 'Unable to update Change request' })
        }
      }
    } else if (req.method === 'DELETE') {
      try {
        await dbClient.deleteDestinationChangeRequest(requestBody.id)
        res.status(200).json('Change Request is deleted')
      } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Unable to delete Change request' })
      }
    } else {
      throw new Error(
        `The HTTP ${req.method} method is not supported at this route.`
      )
    }
  } else {
    res.status(401)
  }
}

const upsertChangeRequest = async (
  changeRequestDetails: DestinationChangeRequest
) => {
  const response = await dbClient.upsertDestinationChangeRequest({
    id: changeRequestDetails.id,
    isDraft: changeRequestDetails.isDraft,
    jiraId: changeRequestDetails.jiraId,
    destId: changeRequestDetails.destId,
    destType: changeRequestDetails.destType,
    requestedAt: new Date(),
    scheduledAt: changeRequestDetails.scheduledAt,
    requestedBy: changeRequestDetails.requestedBy,
    requested: {
      destUri: changeRequestDetails.requested.destUri,
      password: changeRequestDetails.isDraft
        ? null
        : changeRequestDetails.requested.password,
      facilityId: changeRequestDetails.requested.facilityId,
      MSH3: changeRequestDetails.requested.MSH3,
      MSH4: changeRequestDetails.requested.MSH4,
      MSH5: changeRequestDetails.requested.MSH5,
      MSH6: changeRequestDetails.requested.MSH6,
      MSH22: changeRequestDetails.requested.MSH22,
      RXA11: changeRequestDetails.requested.RXA11,
      username: changeRequestDetails.requested.username,
    },
  })
  return response
}

export default withMiddleware('logRequest')(handler)
