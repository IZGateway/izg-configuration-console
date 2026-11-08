import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../../../lib/api/api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import {
  isApiKeyManagementEnabled,
  scopeFromJurisdictionIdInQuery,
} from '../../../lib/security/apiKeyAuthz'

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
    const { envId, jurisdictionId } = req.query
    if (!envId || typeof envId !== 'string') {
      return res.status(400).json({ error: 'envId is required' })
    }
    if (!jurisdictionId || typeof jurisdictionId !== 'string') {
      return res.status(400).json({ error: 'jurisdictionId is required' })
    }

    // envId may be a single id ("5") or, for a multi-env credential, a
    // comma-separated list ("4,5"). Querying multiple is no longer
    // admin-only (IGDD-3549) — any role holding `canListApiKeys` for this
    // jurisdiction may, matching the create route's own relaxed rule.
    const envIds = envId
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n))
    if (envIds.length === 0) {
      return res.status(400).json({ error: 'envId is required' })
    }
    if (envIds.some((n) => n < 1 || n > 5)) {
      return res.status(400).json({ error: 'envId must each be a number between 1 and 5' })
    }

    const dbClient = await DbClientFactory.getDbClient()
    // A domain is only "existing" for the requested scope if it is authorized
    // in EVERY requested environment — so intersect rather than union.
    const domainsPerEnv = await Promise.all(
      envIds.map((id) => dbClient.fetchAuthorizedApiKeyDomains(id, jurisdictionId))
    )
    const [first, ...rest] = domainsPerEnv
    const intersected = first.filter((d) =>
      rest.every((envDomains) => envDomains.some((r) => r.domain === d.domain))
    )

    return res.status(200).json(intersected)
  } catch (error) {
    logger.error('Error fetching authorized API key domains', {
      operation: 'fetchAuthorizedApiKeyDomains',
      httpMethod: req.method,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// IGDD-3549: declarative capability + reach, closing this route's
// `in-handler` debt row. `canListApiKeys` is destination-scoped here (one
// jurisdiction named in the query) — the other shape of the same capability
// used capability-only on apikeys/index.ts GET and apikeysaudit/index.ts GET.
export default withMiddleware({
  capability: { page: 'apikeys', capability: 'canListApiKeys' },
  scope: scopeFromJurisdictionIdInQuery(),
})(handler)
