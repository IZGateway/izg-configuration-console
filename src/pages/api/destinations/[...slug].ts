import type { NextApiRequest, NextApiResponse } from 'next'
import _ from 'lodash'
import withMiddleware, {
  destIdFromSlug,
} from '../../../lib/api/api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import { can } from '../../../lib/security/policy'
import { subjectOf } from '../../../lib/security/authzsubject'
import { asyncRequestContext } from '../../../lib/Context'

// Username, facility id and the HL7 interface fields are the "detail" data:
// shown in ConnectionHistory's detail drawer only when the caller holds
// history.canViewConnectionInfoDetails, which this route previously ignored
// — it returned all of it to anyone holding only canViewConnectionInfo, who
// could read it straight off the network response regardless of what the UI
// drawer chose to render. But this same route also backs EditConnection's
// form prefill, which genuinely needs these fields for anyone who can edit
// the connection (edit.canChangeCredentials) — so inclusion is an OR of the
// two, not a replacement of the existing canViewConnectionInfo gate. Anusha,
// PR #771.
const DETAIL_FIELDS = [
  'username',
  'facilityId',
  'MSH3',
  'MSH4',
  'MSH5',
  'MSH6',
  'MSH11',
  'MSH22',
  'RXA11',
] as const

/**
 * @swagger
 * /api/destinations/{destTypeId}/{destId}:
 *   get:
 *     summary: Get destination information for a destination id for a given destination type id
 *     parameters:
 *       - name: destTypeId
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *         description: The id of the destination type.
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The id of the destination.
 *     responses:
 *       200:
 *         description: OK.
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { slug } = req.query
  const destId = slug[1]
  const destTypeId = _.toNumber(slug[0])
  if (req.method === 'GET') {
    const dbClient = await DbClientFactory.getDbClient()
    const result = await dbClient.fetchDestination(destId, destTypeId)
    if (result) {
      // Decrypted by fetchDestination (dynamo.ts), but neither consumer of
      // this route (ConnectionHistory's connectionInfo.tsx, EditConnection's
      // form prefill) ever reads it — EditConnection always starts its
      // password field blank and never round-trips the stored value. Pure
      // over-exposure: strip it unconditionally, found while fixing the
      // detail-field gap below. PR #771 review.
      delete result.password
      const session = asyncRequestContext.getStore()?.session
      const canViewDetails =
        can(subjectOf(session), 'history', 'canViewConnectionInfoDetails', destId)
          .allowed ||
        can(subjectOf(session), 'edit', 'canChangeCredentials', destId).allowed
      if (!canViewDetails) {
        for (const field of DETAIL_FIELDS) {
          delete result[field]
        }
      }
      res.json(result)
    } else {
      logger.error('Database lookup failed for destination', {
        destinationId: destId,
        destinationType: destTypeId,
        operation: 'fetchDestination',
        httpMethod: req.method,
        endpoint: req.url,
      })
      const errorMessage = `Database lookup failed for destination id: ${destId} and destination type: ${destTypeId}`
      res.status(500)
      res.json({
        error: errorMessage,
      })
    }
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}
export default withMiddleware({
  capability: { page: 'history', capability: 'canViewConnectionInfo' },
  scope: destIdFromSlug,
})(handler)
