import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import hasAccessToDestId from '../../../lib/accesshelper'
import destinationchangerequest from '../../../lib/queries/mutate/destinationchangerequest'
import fetchDestinationchangerequest from '../../../lib/queries/fetch/destinationchangerequest'
import _ from 'lodash'
import createChangeRequestTicket from '../../../lib/createchangerequestticket'
import withMiddleware from '../api-middleware-helper'
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
 *             facility_id: string
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
  if (hasAccessToDestId(requestBody.dest_id, session)) {
    const { dest_id, dest_type_id } = requestBody
    if (req.method === 'POST') {
      try {
        if (await hasActiveChangeRequest(dest_id, dest_type_id)) {
          res.status(409)
          res.json(
            'Conflict creating the requested resource because it already exists.'
          )
        } else {
          await createChangeRequest(requestBody)
          res.status(200)
          res.json('The change request was created.')
        }
      } catch (error) {
        throw new Error(`Error creating change request: ${error}`)
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

const hasActiveChangeRequest = async (
  dest_id: string,
  dest_type_id: number
) => {
  const changeRequest = await fetchDestinationchangerequest(
    dest_id,
    dest_type_id
  )
  return !_.isEmpty(changeRequest)
}

const createChangeRequest = async (changeRequestDetails: any) => {
  const changeRequestTicket = await createChangeRequestTicket(
    changeRequestDetails
  )
  if (!_.isEmpty(changeRequestTicket.id)) {
    await destinationchangerequest({
      ..._.omit(changeRequestDetails.requested, [
        'newPassword',
        'confirmPassword',
      ]),
      password: changeRequestDetails.requested.newPassword,
      jira_id: changeRequestTicket.id,
      dest_id: changeRequestDetails.dest_id,
      dest_type: changeRequestDetails.dest_type_id,
      scheduledAt: changeRequestDetails.scheduledAt,
      requestedBy: changeRequestDetails.requestedBy,
    })
  }
}
export default withMiddleware()(handler)
