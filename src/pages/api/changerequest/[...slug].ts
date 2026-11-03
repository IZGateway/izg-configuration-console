import type { NextApiRequest, NextApiResponse } from 'next'
import _ from 'lodash'
import withMiddleware from '../../../lib/api/api-middleware-helper'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import changeRequestTicketComment from '../../../lib/changerequestticketcomment'
import logger from '../../../../logger'
import { logAccessDenied } from '../../../lib/security/accessDeniedAudit'
import { subjectOf } from '../../../lib/security/authzsubject'
import { can } from '../../../lib/security/policy'
import { asyncRequestContext } from '../../../lib/Context'
/**
 * @swagger
 * /api/changerequest/{destTypeId}/{destId}:
 *   get:
 *     summary: Get destination change request for destination type and destination id.
 *     parameters:
 *       - name: destTypeId
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *         description: The ID of destination type
 *       - name: destId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the destination.
 *     responses:
 *       200:
 *         description: OK.
 * /api/changerequest/{id}:
 *   delete:
 *     summary: Delete a change request by its id. If it is not a draft, also comments on its Jira ticket.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *         description: The ID of the change request.
 *     responses:
 *       200:
 *         description: Change request deleted.
 *       401:
 *         description: Unauthorized, or no access to the change request's destination.
 *       500:
 *         description: Unable to delete the change request.
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { slug } = req.query
  const context = asyncRequestContext.getStore()
  const session = context?.session

  if (!session?.user) {
    return res.status(401).send('unauthorized')
  }

  const dbClient = await DbClientFactory.getDbClient()
  if (req.method === 'GET') {
    const destId = slug[1]
    const destTypeId = _.toNumber(slug[0])

    // Capability and reach are now evaluated combined, role-local, by
    // enforceRouteAuthz before this handler runs — see this file's
    // `withMiddleware` declaration (`scope` reads `slug[1]`).
    const result =
      await dbClient.fetchDestinationChangeRequestByDestIdAndDestType(
        destId,
        destTypeId
      )
    res.json(result)
  } else if (req.method === 'DELETE') {
    const id = _.toNumber(slug[0])
    try {
      const changeRequest = await dbClient.fetchDestinationChangeRequestById(id)

      if (!changeRequest) {
        return res.status(401).send('unauthorized')
      }

      // The destination id this request acts on is not known until the
      // change request itself has been fetched — there is nothing a
      // declarative `scope` extractor could point at before this lookup
      // runs. So, unlike GET above, this method stays in-handler (see the
      // `inHandler` entry in this file's `withMiddleware` declaration) and
      // does the combined capability+reach check itself, via `can()`, the
      // same primitive `decideRouteCapability` uses declaratively elsewhere.
      const decision = can(
        subjectOf(session),
        'changerequest',
        'canCancelRequest',
        changeRequest.destId
      )
      if (!decision.allowed) {
        logAccessDenied({
          reason: 'insufficient role for route access',
          deniedAt: 'api',
          page: 'changerequest',
          permission: 'changerequest.canCancelRequest',
          url: req.url,
          method: req.method,
          user: session.user.email,
          roles: subjectOf(session).roles,
          destId: changeRequest.destId,
        })
        return res.status(403).send('forbidden')
      }

      if (!changeRequest.isDraft) {
        await changeRequestTicketComment(changeRequest.jiraId, new Date())
      }
      await dbClient.deleteDestinationChangeRequest(id)
      logger.info(`Change Request with ID ${id} is deleted by user`)
      res.status(200).json('Change Request is deleted')
    } catch (error) {
      logger.error('Failed to delete change request by user', {
        changeRequestId: id,
        timestamp: new Date().toISOString(),
        operation: 'delete_change_request',
        errorMessage: error.message,
        errorType: error.name,
      })
      res.status(500).json({ error: 'Unable to delete Change request' })
    }
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}
// Same shape as changerequest/index.ts before IGDD-3472: error capture plus an
// in-handler reach check only, so reach was checked and capability never was.
// See the note there.
//
// protect-connection-pages-and-endpoints (IGDD-3545/3548): GET's `scope`
// reads `slug[1]`, closing its `split-decision` row via the same combined,
// role-local check `decideRouteCapability` runs declaratively elsewhere.
// DELETE stays `inHandler` — its destination id only exists after the
// in-handler database lookup above, which no declarative `scope` extractor
// can express — so this one row converts to `in-handler` rather than
// disappearing; see authzDebt.ts.
export default withMiddleware(
  {
    byMethod: {
      GET: {
        page: 'changerequest',
        capability: 'canViewDetails',
        scope: (req) => (req.query.slug as string[] | undefined)?.[1],
      },
      DELETE: {
        inHandler:
          'IGDD-3545/3548: destination id only known after fetching the change request by id',
      },
    },
  },
  'captureErrors'
)(handler)
