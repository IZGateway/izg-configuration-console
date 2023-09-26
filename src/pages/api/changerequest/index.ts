import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import hasAccessToDestId from '../../../lib/accesshelper'
import destinationchangerequest from '../../../lib/queries/mutate/destinationchangerequest'
import _ from 'lodash'
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
const CHANGE_REQUESTED_EMPTY_VALUE = '<OLD VALUE REMOVED>'
const CURRENT_EMPTY_VALUE = ' '
const CHANGE_REQUEST_UNCHANGED_VALUE = 'UNCHANGED'

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

const getRequestedValue = (
  requestedFields: any,
  fieldToGetValueFrom: string
) => {
  return _.has(requestedFields, fieldToGetValueFrom)
    ? _.isEmpty(requestedFields[fieldToGetValueFrom])
      ? CHANGE_REQUESTED_EMPTY_VALUE
      : requestedFields[fieldToGetValueFrom]
    : CHANGE_REQUEST_UNCHANGED_VALUE
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const jiraBasicAuthHeader = 'Basic ' + JIRA_API_AUTH_BASE64
  const requestBody = JSON.parse(req.body)
  const session = await getServerSession(req, res, authOptions)

  if (!isJiraConfigured) {
    throw new Error(
      'Jira connection is not configured correctly. Ensure the necessary variables have been configured for the environment.'
    )
  }
  if (hasAccessToDestId(requestBody.dest_id, session)) {
    const {
      current,
      requested,
      dest_id,
      dest_type,
      dest_type_id,
      requestedBy,
      scheduledAt,
    } = requestBody
    if (req.method === 'POST') {
      const humanReadableScheduledTime = new Date(scheduledAt)
      const changeRequestSummaryTemplate = `Destination ${dest_id} on ${dest_type} to be updated on ${humanReadableScheduledTime.toLocaleString()}`
      const changeRequestDetailsTemplate = `*Destination Id*: ${dest_id}\r\n*Environment*: ${dest_type}\r\n*Requested By*: ${requestedBy}\r\n|| ||CURRENT CONFIG VALUES||REQUESTED CONFIG VALUES||\r\n|*Username*|${
        _.isEmpty(current.username)
          ? CHANGE_REQUESTED_EMPTY_VALUE
          : current.username
      }|${getRequestedValue(requested, 'username')}|\r\n|*Password*|REDACTED |${
        _.has(requested, 'newPassword')
          ? '<UPDATED>'
          : CHANGE_REQUEST_UNCHANGED_VALUE
      } |\r\n|*Facility id*|${
        _.isEmpty(current.facility_id)
          ? CURRENT_EMPTY_VALUE
          : current.facility_id
      }|${getRequestedValue(requested, 'facility_id')}|\r\n|*MSH3*|${
        _.isEmpty(current.MSH3) ? CURRENT_EMPTY_VALUE : current.MSH3
      }|${getRequestedValue(requested, 'MSH3')}|\r\n|*MSH4*|${
        _.isEmpty(current.MSH4) ? CURRENT_EMPTY_VALUE : current.MSH4
      }|${getRequestedValue(requested, 'MSH4')}|\r\n|*MSH5*|${
        _.isEmpty(current.MSH5) ? CURRENT_EMPTY_VALUE : current.MSH5
      }|${getRequestedValue(requested, 'MSH5')}|\r\n|*MSH6*|${
        _.isEmpty(current.MSH6) ? CURRENT_EMPTY_VALUE : current.MSH6
      }|${getRequestedValue(requested, 'MSH6')}|\r\n|*MSH22*|${
        _.isEmpty(current.MSH22) ? CURRENT_EMPTY_VALUE : current.MSH22
      }|${getRequestedValue(requested, 'MSH22')}|\r\n|*RXA11*|${
        _.isEmpty(current.RXA11) ? CURRENT_EMPTY_VALUE : current.RXA11
      }|${getRequestedValue(
        requested,
        'RXA11'
      )}|\r\n*Deploy Datetime*: ${humanReadableScheduledTime.toLocaleString()}\r\n\r\n*Config Console Links*\r\n\*Test Change Request*: https://dev.console.izgateway.org/cc/test/1234\r\n*Deploy Change Request*: https://dev.console.izgateway.org/cc/deploy/1234`
      try {
        const jiraResponse = await fetch(JIRA_API_URL + '/issue', {
          method: 'POST',
          headers: new Headers({
            Authorization: jiraBasicAuthHeader,
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            fields: {
              project: {
                id: JIRA_API_PROJECT_ID,
              },
              summary: changeRequestSummaryTemplate,
              description: changeRequestDetailsTemplate,
              issuetype: {
                id: JIRA_API_ISSUE_TYPE,
              },
            },
          }),
        })
        if (jiraResponse.status !== 201) {
          res.status(500)
          res.json(
            'Error creating Jira ticket. Jira returned HTTP status: ' +
              jiraResponse.status
          )
          throw new Error(
            'There was a problem creating the Jira ticket. HTTP Status: ' +
              jiraResponse.status
          )
        } else {
          const jiraResult = await jiraResponse.json()
          await destinationchangerequest({
            ..._.omit(requestBody.requested, [
              'newPassword',
              'confirmPassword',
            ]),
            password: requestBody.requested.newPassword,
            jira_id: jiraResult.id,
            dest_id: requestBody.dest_id,
            dest_type: requestBody.dest_type_id,
            scheduledAt: requestBody.scheduledAt,
            requestedBy: requestBody.requestedBy,
          })
        }
      } catch (error) {
        throw new Error(`Error creating change request: ${error}`)
      }
      res.status(200)
      res.json('The change request was created.')
    } else {
      throw new Error(
        `The HTTP ${req.method} method is not supported at this route.`
      )
    }
  } else {
    res.status(401)
  }
}
