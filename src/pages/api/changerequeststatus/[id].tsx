import type { NextApiRequest, NextApiResponse } from 'next'
import getChangeRequestStatus from '../../../lib/getChangeRequestStatus'
import withMiddleware from '../../../lib/api/api-middleware-helper'

/**
 * @swagger
 * /api/changerequest/{jira_id}:
 *   get:
 *     summary: Get change requets ticket status by Jira ID.
 *     parameters:
 *       - name: jira_id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the JIra ticket.
 *     responses:
 *       200:
 *         description: Status of change requets jira ticket is successfully derived.
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

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = req.query.id.toString()

  if (!isJiraConfigured) {
    throw new Error(
      'Jira connection is not configured correctly. Ensure the necessary variables have been configured for the environment.'
    )
  }

  if (req.method === 'GET') {
    const result = await getChangeRequestStatus(id)
    res.json(result)
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}

// An API route with a .tsx extension, and one of the two files that bypassed
// withMiddleware entirely before IGDD-3472. A `**/*.ts` coverage glob would
// skip precisely the file the test exists to catch, which is why the route
// enumeration covers both extensions.
//
// { session: true } is the status quo written down: this proxies a Jira ticket
// lookup by ID and the handler applies no reach filter, so there is no
// capability to declare without deciding one.
export default withMiddleware({ session: true })(handler)
