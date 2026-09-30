import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../../../lib/api/api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { hasApiKeyPermission } from '../../../lib/security/apiKeyAuthz'
import { scopeToOwnedJurisdictions } from '../../../lib/apikeys/scope'

/**
 * @swagger
 * /api/apikeysaudit:
 *   get:
 *     summary: API key lifecycle activity feed across every credential the caller can see
 *     responses:
 *       200:
 *         description: OK. Audit rows, newest first.
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient role
 *       500:
 *         description: Internal server error
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized - Please login' })
    }
    if (!hasApiKeyPermission(session, 'canListApiKeys')) {
      return res.status(403).json({ error: 'Forbidden - insufficient role' })
    }

    const dbClient = await DbClientFactory.getDbClient()

    // Tenancy: scope by the CREDENTIAL's jurisdiction, resolved from the
    // credential list, not from a jurisdictionId on the audit row itself.
    // Two reasons: not every changeType carries one in its context (Reissue
    // records only the successor linkage), and deriving it from the stored
    // credential keeps this list consistent with GET /api/apikeys by
    // construction — the same rows, the same gate.
    const credentials = await dbClient.fetchApiKeyCredentials()
    const visible = await scopeToOwnedJurisdictions(
      session,
      'canListApiKeys',
      credentials ?? []
    )
    const visibleSortKeys = new Set(visible.map((c) => String(c.sortKey)))

    const audits = await dbClient.fetchApiKeyCredentialAudits()
    const scoped = audits
      .filter((row) => visibleSortKeys.has(String(row.credentialSortKey)))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

    return res.status(200).json(scoped)
  } catch (error) {
    logger.error('Error fetching API key audit log', {
      operation: 'fetchApiKeyCredentialAudits',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// Declared { inHandler } to match the five existing apikeys/* routes: this
// handler checks canListApiKeys itself and then scopes rows to the caller's
// owned jurisdictions, so the decision is per-row and cannot be expressed as
// a single route-level capability. Arrived on develop after IGDD-3472 was
// branched, with no declaration at all - the required argument is what
// stopped the build and forced this line to be written.
export default withMiddleware({
  inHandler:
    'IGDD-3472: handler checks canListApiKeys, then scopes rows to owned jurisdictions',
})(handler)
