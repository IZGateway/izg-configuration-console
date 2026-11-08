import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../../../lib/api/api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import {
  isApiKeyManagementEnabled,
  scopeFromCredentialSortKeyInQuery,
} from '../../../lib/security/apiKeyAuthz'

/**
 * @swagger
 * /api/apikeysaudit/{sortKey}:
 *   get:
 *     summary: Get the lifecycle audit history for an API key credential
 *     parameters:
 *       - name: sortKey
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The credential's sortKey (its jti)
 *     responses:
 *       200:
 *         description: OK. Returns the credential's audit history, oldest first.
 *       400:
 *         description: Bad request - missing sortKey
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient role, or not this caller's jurisdiction
 *       404:
 *         description: API key not found
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
    if (!isApiKeyManagementEnabled()) {
      return res.status(403).json({ error: 'Forbidden - feature disabled' })
    }

    const { sortKey } = req.query
    if (!sortKey || typeof sortKey !== 'string') {
      return res.status(400).json({ error: 'sortKey is required' })
    }

    const dbClient = await DbClientFactory.getDbClient()

    // Tenancy (fix IDOR: jurisdiction comes from the STORED credential,
    // never a client-supplied one, matching token.ts and verify-domain)
    // already happened declaratively, in the route's `scope` extractor,
    // before this handler ran at all — this is a second, independent read
    // for the business logic below (accepted two-reads trade-off, IGDD-3549
    // design.md Risks).
    const credential = await dbClient.getApiKeyCredential(sortKey)
    if (!credential) {
      return res.status(404).json({ error: 'API key not found' })
    }

    const history = await dbClient.fetchApiKeyCredentialAuditHistory(sortKey)

    // The audit row's DynamoDB sortKey is `<credentialSortKey>#<ISO timestamp>`,
    // so the Query already returns these in chronological order — sort
    // defensively anyway so the response contract does not depend on that.
    history.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    return res.status(200).json(history)
  } catch (error) {
    logger.error('Error fetching API key credential audit history', {
      operation: 'fetchApiKeyCredentialAuditHistory',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// IGDD-3549: declarative capability + reach, closing this route's
// `in-handler` debt row. `canListApiKeys` is destination-scoped here (one
// credential's jurisdiction) — the same capability is capability-only on
// apikeysaudit/index.ts GET (a list, row-filtered after) — the regression
// case for the shared-capability design decision (see the `hasScope` doc on
// `decideRouteCapability`).
export default withMiddleware({
  capability: { page: 'apikeys', capability: 'canListApiKeys' },
  scope: scopeFromCredentialSortKeyInQuery(),
})(handler)
