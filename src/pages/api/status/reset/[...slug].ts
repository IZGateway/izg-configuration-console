import type { NextApiRequest, NextApiResponse } from 'next'
import * as fs from 'fs'
import path from 'path'
import https from 'https'
import axios from 'axios'
import logger from '../../../../../logger'
import withMiddleware from '../../../../lib/api/api-middleware-helper'
import _ from 'lodash'
import IZGHubStatusHistoryEndpoint from '../../../../lib/IZGHubStatusHistoryEndpoint'
import { asyncRequestContext } from '../../../../lib/Context'
import { logAccessDenied } from '../../../../lib/security/accessDeniedAudit'
import { subjectOf } from '../../../../lib/security/authzsubject'
import { can } from '../../../../lib/security/policy'
import { hubOperationLevel } from '../../../../lib/utils/hubregionstatus'

/**
 * @swagger
 * /api/status/reset/{destTypeId}/{destId}:
 *   post:
 *     summary: Reset the circuit breaker for a single destination.
 *     parameters:
 *       - name: destTypeId
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *         description: The ID of the destination type.
 *       - name: destId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the destination.
 *     responses:
 *       200:
 *         description: >
 *           The destination status returned by the Hub, with `statusBy`,
 *           `hosts` and `regions` removed. The first two carry private Hub
 *           host names; `regions` names AWS regions, which a
 *           jurisdiction-scoped caller of this route has no use for. In their
 *           place, `resetComplete` is true only when the Hub cleared the
 *           breaker on every instance. The Hub answers 200 even when it did
 *           not, so a caller must read `resetComplete` rather than the status
 *           code. The field is absent against a Hub release older than
 *           IGDD-3599.
 *       404:
 *         description: Destination not found.
 *       502:
 *         description: The Hub could not be reached.
 */
/**
 * Strips every description of Hub infrastructure from a body before it reaches
 * the browser, matching the redaction `fetchEndpointStatus.ts` applies on
 * initial load.
 *
 * - `statusBy` names the instance that recorded the status.
 * - `hosts` (IGDD-3599) is keyed by private AWS DNS name, for example
 *   `"us-west-1:ip-10-161-101-98"`.
 * - `regions` (IGDD-3599) names the AWS regions the Hub runs in.
 *
 * `regions` is browser-safe in general — it holds no host name and no instance
 * count — and the Admin Operations page does render it. This route is
 * different. Manage Connections is reachable by `Jurisdiction Operations`, a
 * jurisdiction-scoped role, and a Maryland operator has no use for
 * "us-west-2 is degraded but us-east-1 is fine". It is infrastructure they do
 * not own and cannot act on. Leaving the block in the body and merely not
 * rendering it would still expose it in developer tools, which is the state
 * this codebase already rejects for `statusBy`. So it is removed here and
 * collapsed into `resetComplete`.
 *
 * Applied to the error body as well as the success body. The rule is
 * unconditional, and an error body is still a Hub body.
 */
const redactHubTopology = (body: Record<string, unknown>) => {
  if (!body || typeof body !== 'object') {
    return body
  }
  delete body.statusBy
  delete body.hosts
  delete body.regions
  return body
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const context = asyncRequestContext.getStore()
  const { slug } = req.query
  const destId = slug[1]
  const destTypeId = _.toNumber(slug[0])

  // Permission and tenancy evaluated together, from the SAME held role — the
  // same rule `apikeys` uses (see policy.ts). This used to be a role-list
  // membership check plus a SEPARATE tenancy check (the `checkAccessToDestIdSlug`
  // middleware), evaluated independently: `(∃r: role∈allowed) ∧ (∃r: reach(r))`.
  // That let a user holding a globally-scoped role with no reset permission
  // (e.g. `IZG Support`) combine with a different, jurisdiction-scoped role
  // that IS allowed to reset (e.g. `Jurisdiction Operations`) to reset a
  // circuit breaker OUTSIDE that second role's own jurisdiction — access
  // neither role grants alone.
  const decision = can(
    subjectOf(context?.session),
    'manageconnections',
    'canResetCircuitBreaker',
    destId
  )
  if (!decision.allowed) {
    logAccessDenied({
      reason: 'role not permitted to reset circuit breaker',
      url: req.url,
      method: req.method,
      user: context?.user,
      roles: subjectOf(context?.session).roles,
    })
    return res.status(401).send('unauthorized')
  }

  const IZG_STATUS_ENDPOINT_URL = process.env.IZG_STATUS_ENDPOINT_URL || ''
  const IZG_ENDPOINT_CRT_PATH = process.env.IZG_ENDPOINT_CRT_PATH || undefined
  const IZG_ENDPOINT_KEY_PATH = process.env.IZG_ENDPOINT_KEY_PATH || undefined
  const IZG_ENDPOINT_PASSCODE = process.env.IZG_ENDPOINT_PASSCODE || undefined
  const httpsAgentOptions = {
    cert: fs.readFileSync(path.resolve(IZG_ENDPOINT_CRT_PATH), 'utf-8'),
    key: fs.readFileSync(path.resolve(IZG_ENDPOINT_KEY_PATH), 'utf-8'),
    passphrase: IZG_ENDPOINT_PASSCODE,
    rejectUnauthorized: false,
    keepAlive: true,
  }
  const configuredHubURLs = new IZGHubStatusHistoryEndpoint(
    IZG_STATUS_ENDPOINT_URL
  )

  const resetCircuitBreaker = async (destTypeId: number, destId: string) => {
    const configuredEndpoint = configuredHubURLs.getIZGHubURL(destTypeId)
    const resetUrl =
      configuredEndpoint.substring(
        0,
        configuredEndpoint.indexOf('/rest/') + 6
      ) + `reset/${destId}`
    return axios.post(
      resetUrl,
      {},
      {
        httpsAgent: new https.Agent(httpsAgentOptions),
        timeout: 30000,
      }
    )
  }

  if (req.method === 'POST') {
    try {
      const response = await resetCircuitBreaker(destTypeId, destId)
      logger.info('Circuit breaker reset', {
        destinationId: destId,
        destinationType: destTypeId,
        grantedBy: decision.grantedBy,
        operation: 'resetCircuitBreaker',
        // IGDD-3599: the per-region block is browser-safe by construction, so
        // it is logged as-is. `hosts` is not, and is never read.
        regions: response.data?.regions,
      })
      // IGDD-3599: one boolean in place of the per-region detail. Absent when
      // the Hub sent no `regions` block, which is a pre-IGDD-3599 Hub; the
      // dialog then behaves as it did before this change.
      const level = hubOperationLevel(response.data?.regions)
      const body = redactHubTopology(response.data)
      if (body && typeof body === 'object' && level) {
        body.resetComplete = level === 'success'
      }
      res.status(response.status).json(body)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        logger.error('Hub rejected circuit breaker reset request', {
          destinationId: destId,
          destinationType: destTypeId,
          statusCode: error.response.status,
          responseData: error.response.data,
          operation: 'resetCircuitBreaker',
        })
        res.status(error.response.status).json(
          redactHubTopology(error.response.data)
        )
      } else {
        logger.error('Failed to reach the Hub to reset circuit breaker', {
          destinationId: destId,
          destinationType: destTypeId,
          errorMessage: error.message,
          errorType: error.name,
          stack: error.stack,
          operation: 'resetCircuitBreaker',
        })
        res.status(502).json({ error: 'Failed to reach the Hub' })
      }
    }
  } else {
    res.setHeader('Allow', ['POST'])
    return res
      .status(405)
      .json({ error: `The HTTP ${req.method} method is not supported at this route.` })
  }
}

// No `checkAccessToDestIdSlug` here — that middleware is a reach-only check,
// and pairing it separately from a permission check is exactly the escalation
// this route used to be vulnerable to. `can()` above is the sole, authoritative
// gate; it already evaluates reach.
export default withMiddleware({
  inHandler: 'IGDD-3472: per-destination reset; maps to manageconnections.canResetCircuitBreaker plus a reach check, NOT the hub-wide flag',
})(handler)
