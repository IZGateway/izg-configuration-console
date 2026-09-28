import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import {
  hasApiKeyPermission,
  requireApiKeyAccess,
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
    if (!hasApiKeyPermission(session, 'canListApiKeys')) {
      return res.status(403).json({ error: 'Forbidden - insufficient role' })
    }

    const { sortKey } = req.query
    if (!sortKey || typeof sortKey !== 'string') {
      return res.status(400).json({ error: 'sortKey is required' })
    }

    const dbClient = await DbClientFactory.getDbClient()

    // Tenancy (fix IDOR): a credential's history is as sensitive as the
    // credential row itself — it names the domain, use-type scope and every
    // actor who touched it. The jurisdiction is derived from the STORED
    // credential rather than trusted from the caller, matching token.ts and
    // verify-domain, so a caller cannot pair another jurisdiction's sortKey
    // with its own jurisdictionId to pass the ownership check.
    const credential = await dbClient.getApiKeyCredential(sortKey)
    if (!credential) {
      return res.status(404).json({ error: 'API key not found' })
    }
    const authz = await requireApiKeyAccess(
      session,
      'canListApiKeys',
      credential.jurisdictionId
    )
    if (!authz.ok) {
      return res.status(authz.status).json({ error: authz.error })
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

export default withMiddleware()(handler)
