import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { requireApiKeyAccess } from '../../../lib/security/apiKeyAuthz'

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
    const { envId, jurisdictionId } = req.query
    if (!envId || typeof envId !== 'string') {
      return res.status(400).json({ error: 'envId is required' })
    }
    if (!jurisdictionId || typeof jurisdictionId !== 'string') {
      return res.status(400).json({ error: 'jurisdictionId is required' })
    }
    // Role + tenancy: only list authorized domains for a jurisdiction the
    // caller owns.
    const authz = await requireApiKeyAccess(session, 'canListApiKeys', jurisdictionId)
    if (!authz.ok) {
      return res.status(authz.status).json({ error: authz.error })
    }

    // envId may be a single id ("5") or, for a multi-env credential, a
    // comma-separated list ("4,5") — requesting multiple is an admin-only
    // capability (server-enforced, matching the create route), since it's
    // only meaningful for the multi-env select on the Create form.
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
    if (envIds.length > 1 && !session.user.isAdmin) {
      return res.status(403).json({ error: 'Only administrators may query multiple environments' })
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

export default withMiddleware()(handler)
