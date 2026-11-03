import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import _ from 'lodash'
import createChangeRequestTicket, {
  ChangeRequestTicketError,
} from '../../../lib/createchangerequestticket'
import withMiddleware from '../../../lib/api/api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import { DestinationChangeRequest } from '../../../lib/type/DestinationChangeRequest'
import changeRequestTicketComment from '../../../lib/changerequestticketcomment'
import { assertSafeDestinationUri } from '../../../lib/security/assertSafeDestinationUri'
import { UnsafeDestinationUriError } from '../../../lib/security/destinationUriGuard'
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

/**
 * Reads what a failed ticket call knows about the ticket. Returns undefined when
 * the failure carries no verdict, which the caller reports as unknown.
 */
const classifyTicketFailure = (error: unknown): boolean | undefined => {
  if (error instanceof ChangeRequestTicketError) {
    return error.ticketMayExist
  }
  const cause = (error as { cause?: unknown })?.cause
  if (cause instanceof ChangeRequestTicketError) {
    return cause.ticketMayExist
  }
  return undefined
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const requestBody = JSON.parse(req.body)
  const session = await getServerSession(req, res, authOptions)
  const dbClient = await DbClientFactory.getDbClient()
  requestBody.requestedBy = session?.user?.email || 'unknown'
  if (!isJiraConfigured) {
    throw new Error(
      'Jira connection is not configured correctly. Ensure the necessary variables have been configured for the environment.'
    )
  }
  // Capability (per method) and reach are now evaluated combined, role-local,
  // by enforceRouteAuthz before this handler runs — see this file's
  // `withMiddleware` declaration (`scope` reads `requestBody.destId`).
  // Previously this was wrapped in a SEPARATE, independent reach check, after
  // a capability check the middleware had already run with ANY_JURISDICTION —
  // the split-decision gap protect-connection-pages-and-endpoints
  // (IGDD-3545/3548) closes.
  const { isDraft } = requestBody

  // A destUri written here becomes the live destination address on deploy, so
  // it must satisfy the destination URL specification before it can enter
  // change control at all. Checked ahead of the method branches so that no
  // Jira ticket is raised and no draft is stored for a URI we would refuse.
  if (req.method === 'POST' || req.method === 'PUT') {
    const requestedDestUri = requestBody?.requested?.destUri
    // The form always sends the full field set, so an unchanged destUri
    // arrives on every edit. A URI already live for this connection is not
    // re-judged: it predates the specification (e.g. a WSDL URL ending in
    // '?'), and rejecting it would block unrelated edits such as a password
    // change. Compared with the stored value, never the client's `current`,
    // which the caller controls. If the read fails, the URI is validated.
    // Read from the base repository: only destUri is needed, so skip the
    // password decrypt, which could otherwise fail and reject the edit.
    const storedDestUri = requestedDestUri
      ? await dbClient
          .getRepository()
          .fetchDestination(requestBody.destId, requestBody?.destType?.typeId)
          .then((destination) => destination?.destUri)
          .catch(() => undefined)
      : undefined
    if (requestedDestUri && requestedDestUri !== storedDestUri) {
      try {
        await assertSafeDestinationUri(
          requestedDestUri,
          requestBody?.destType?.typeId
        )
      } catch (error) {
        if (!(error instanceof UnsafeDestinationUriError)) {
          throw error
        }
        logger.warn('Rejected unsafe destUri on change request', {
          destId: requestBody.destId,
          destType: requestBody?.destType?.type,
          destUri: requestedDestUri,
          isDraft,
          userId: session?.user?.email,
          reason: error.message,
          operation: 'reject_change_request_dest_uri',
        })
        res.status(400).json({ error: error.message })
        return
      }
    }
  }

  if (req.method === 'POST') {
    if (isDraft === true) {
      const draft = await upsertChangeRequest(requestBody)
      if (draft) {
        logger.info('Change request draft saved successfully', {
          destId: requestBody.destId,
          userId: session?.user?.email,
          draftId: draft.id,
          operation: 'save_draft',
        })
        res.status(200)
        res.json(draft)
      } else {
        res.status(500)
        res.json('Error saving draft.')
      }
    } else {
      let changeRequestTicketResponse = null
      try {
        changeRequestTicketResponse = await createChangeRequestTicket({
          ...requestBody,
        })
        if (changeRequestTicketResponse) {
          if (
            _.isEmpty(requestBody.requested.newPassword) &&
            _.isEmpty(requestBody.requested.confirmPassword)
          ) {
            requestBody.requested.password =
              await dbClient.fetchDestinationPassword(
                requestBody.destId,
                requestBody.destType.typeId
              )
            requestBody.isPasswordDifferent = false
          } else {
            requestBody.isPasswordDifferent = true
            requestBody.requested.password = requestBody.requested.newPassword
          }
          _.omit(requestBody.requested, ['newPassword', 'confirmPassword'])
          await upsertChangeRequest({
            ...requestBody,
            jiraId: changeRequestTicketResponse.key,
          })
          logger.info('Change request ticket created successfully', {
            destId: requestBody.destId,
            destType: requestBody.destType.type,
            jiraTicketId: changeRequestTicketResponse?.key,
            userId: session?.user?.email,
            operation: 'create_change_request_ticket',
          })
        }
        res.status(200).json('Change request ticket created successfully.')
      } catch (error) {
        // IGDD-3566: report which failure this is, because the three are very
        // different for the caller. A ticket that provably does not exist lets
        // the console report a clean failure at once. A ticket that does exist
        // must never be reported as "nothing happened". Anything we cannot
        // classify is reported as unknown, so the console confirms rather than
        // inviting a retry that could raise a second ticket.
        const ticketCreated = _.isNull(changeRequestTicketResponse)
          ? classifyTicketFailure(error)
          : true
        logger.error(
          `Error creating change request ticket for destination id ${requestBody.destId} on environment ${requestBody.destType.type} : ${error}`,
          {
            destId: requestBody.destId,
            destType: requestBody.destType?.type,
            jiraTicketId: changeRequestTicketResponse?.key,
            ticketCreated,
            userId: session?.user?.email,
            operation: 'create_change_request_ticket',
          }
        )
        if (_.isUndefined(ticketCreated)) {
          // No usable answer. Say nothing about the ticket so that the console
          // looks up the record instead of guessing.
          res.status(500).json({})
        } else {
          res.status(ticketCreated ? 500 : 502).json({ ticketCreated })
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

        await dbClient.upsertDestinationChangeRequest({
          id: requestBody.id,
          destId: requestBody.destId,
          destType: requestBody.destType,
          jiraId: requestBody.jiraId,
          requestedBy: requestBody.requestedBy,
          requestedAt: new Date(),
          scheduledAt: requestBody.scheduledAt,
          isDraft: false,
          isPasswordDifferent: requestBody.isPasswordDifferent,
          createdBy: requestBody.createdBy,
          createdOn: requestBody.createdOn,
          updatedBy: requestBody.updatedBy,
          updatedOn: requestBody.updatedOn,
          requested: {
            destUri: requestBody.requested.destUri,
            username: requestBody.requested.username,
            MSH3: requestBody.requested.MSH3,
            MSH4: requestBody.requested.MSH4,
            MSH5: requestBody.requested.MSH5,
            MSH6: requestBody.requested.MSH6,
            MSH11: requestBody.requested.MSH11,
            MSH22: requestBody.requested.MSH22,
            RXA11: requestBody.requested.RXA11,
            facilityId: requestBody.requested.facilityId,
          },
        })
        logger.info(
          `Change Request schedule with Jira ticket id ${requestBody.jiraId} was updated.`
        )
        res.status(200).json('Change Request is updated')
      } catch (error) {
        logger.debug(error)
        res.status(500).json({ error: 'Unable to update Change request' })
      }
    } else {
      try {
        await dbClient.upsertDestinationChangeRequest(requestBody)
        logger.info(
          `Change Request with Jira ticket id ${requestBody.jiraId} was updated.`
        )
        res.status(200).json('Change Request is updated')
      } catch (error) {
        logger.debug(error)
        res.status(500).json({ error: 'Unable to update Change request' })
      }
    }
  } else if (req.method === 'DELETE') {
    try {
      await dbClient.deleteDestinationChangeRequest(requestBody.id) // Log deleter info
      logger.info('Change request deleted successfully', {
        changeRequestId: requestBody.id,
        userId: session?.user?.email,
        operation: 'delete_change_request',
      })
      res.status(200).json('Change Request is deleted')
    } catch (error) {
      logger.debug(error)
      res.status(500).json({ error: 'Unable to delete Change request' })
    }
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}

const upsertChangeRequest = async (
  changeRequestDetails: DestinationChangeRequest
) => {
  const dbClient = await DbClientFactory.getDbClient()
  const response = await dbClient.upsertDestinationChangeRequest({
    id: changeRequestDetails.id,
    isDraft: changeRequestDetails.isDraft,
    jiraId: changeRequestDetails.jiraId,
    destId: changeRequestDetails.destId,
    destType: changeRequestDetails.destType,
    requestedAt: new Date(),
    scheduledAt: changeRequestDetails.scheduledAt,
    requestedBy: changeRequestDetails.requestedBy,
    createdBy: changeRequestDetails.createdBy,
    createdOn: changeRequestDetails.createdOn,
    updatedBy: changeRequestDetails.updatedBy,
    updatedOn: changeRequestDetails.updatedOn,
    isPasswordDifferent: changeRequestDetails.isPasswordDifferent || false,
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
      MSH11: changeRequestDetails.requested.MSH11,
      MSH22: changeRequestDetails.requested.MSH22,
      RXA11: changeRequestDetails.requested.RXA11,
      username: changeRequestDetails.requested.username,
    },
  })
  return response
}

// A privilege fix, not cleanup. This route was wrapped in withMiddleware()
// with no authorization middleware at all and checked only hasAccessToDestId
// in the handler - reach without capability. IZG Support holds
// globalTenancy: true with canCancelRequest: false, so it could cancel or
// reschedule a change request on ANY destination in the system. The flags
// already said no; nothing read them.
//
// protect-connection-pages-and-endpoints (IGDD-3545/3548): each method's
// `scope` reads `requestBody.destId`, so capability and reach are now
// evaluated combined, role-local, by `decideRouteCapability`
// (REQUIRES_DESTINATION_SCOPE) — closing this route's `split-decision` row.
// `req.body` arrives as a raw string here, not a parsed object: the frontend
// sends no `Content-Type: application/json` header, so Next's default body
// parser leaves it untouched — the handler itself calls `JSON.parse(req.body)`
// for the same reason. A throw (malformed body) is caught by the caller in
// api-middleware-helper, which treats it as naming no destination.
const destIdFromBody = (req: { body?: string }): string | undefined =>
  JSON.parse(req.body || '{}').destId
export default withMiddleware({
  byMethod: {
    POST: {
      page: 'edit',
      capability: 'canCreateChangeRequest',
      scope: destIdFromBody,
    },
    PUT: {
      page: 'changerequest',
      capability: 'canRescheduleRequest',
      scope: destIdFromBody,
    },
    DELETE: {
      page: 'changerequest',
      capability: 'canCancelRequest',
      scope: destIdFromBody,
    },
  },
})(handler)
