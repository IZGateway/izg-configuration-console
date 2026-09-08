import type { NextApiRequest, NextApiResponse } from 'next'
import * as fs from 'fs'
import path from 'path'
import https from 'https'
import axios from 'axios'
import logger from '../../../../../logger'
import withMiddleware from '../../api-middleware-helper'
import _ from 'lodash'
import IZGHubStatusHistoryEndpoint from '../../../../lib/IZGHubStatusHistoryEndpoint'
import { asyncRequestContext } from '../../../../lib/Context'
import { subjectOf } from '../../../../lib/security/authzsubject'
import { can } from '../../../../lib/security/policy'

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
 *         description: OK.
 *       404:
 *         description: Destination not found.
 *       502:
 *         description: The Hub could not be reached.
 */
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
      })
      // Remove statusBy field to prevent private IP/DNS being delivered to
      // client, matching fetchEndpointStatus.ts's redaction on initial load.
      delete response.data?.statusBy
      res.status(response.status).json(response.data)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        logger.error('Hub rejected circuit breaker reset request', {
          destinationId: destId,
          destinationType: destTypeId,
          statusCode: error.response.status,
          responseData: error.response.data,
          operation: 'resetCircuitBreaker',
        })
        res.status(error.response.status).json(error.response.data)
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
export default withMiddleware()(handler)
