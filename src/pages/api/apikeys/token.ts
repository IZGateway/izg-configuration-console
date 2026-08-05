import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { getJwtSigningSecret, issueApiKeyJwt } from '../../../lib/apikeys/jwt'
import {
  hasApiKeyPermission,
  requireApiKeyAccess,
} from '../../../lib/security/apiKeyAuthz'

// Reveals an API key's JWT exactly once. The token is never persisted —
// its claims (jti, upn, env, iat, exp) are fixed when the credential was
// created/activated and stored on the row, so it can be deterministically
// re-signed here (HMAC-SHA256 is deterministic for identical input) the
// first time someone actually views it. Once viewedAt is set, the token
// can never be retrieved again through this endpoint.
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized - Please login' })
    }
    // Revealing the token hands out a live bearer credential, so it is gated on
    // the mint capability (`canCreateApiKey`), not merely list/read access.
    if (!hasApiKeyPermission(session, 'canCreateApiKey')) {
      return res.status(403).json({ error: 'Forbidden - insufficient role' })
    }

    const { sortKey } = req.body
    if (!sortKey) {
      return res.status(400).json({ error: 'sortKey is required' })
    }

    const dbClient = await DbClientFactory.getDbClient()
    const credential = await dbClient.getApiKeyCredential(String(sortKey))
    if (!credential) {
      return res.status(404).json({ error: 'API key not found' })
    }
    // Role + tenancy (fix IDOR): the caller must own the credential's
    // jurisdiction — otherwise any authorized user could reveal another
    // jurisdiction's token. Authoritative gate, evaluated right before the
    // token is reconstructed.
    const authz = requireApiKeyAccess(session, 'canCreateApiKey', credential.jurisdictionId)
    if (!authz.ok) {
      return res.status(authz.status).json({ error: authz.error })
    }
    if (credential.status !== 'active') {
      return res.status(400).json({ error: 'Only active keys have a retrievable token' })
    }
    if (credential.viewedAt) {
      return res.status(410).json({ error: 'This token has already been viewed and cannot be retrieved again' })
    }
    if (!credential.domain || !credential.createdOn || !credential.expiresAt) {
      return res.status(400).json({ error: 'This key is missing data required to regenerate its token' })
    }

    const { secretString, kid } = await getJwtSigningSecret()
    const token = issueApiKeyJwt({
      jurisdictionId: credential.jurisdictionId,
      jti: credential.jti,
      upn: credential.domain,
      secretString,
      kid,
      // Prefer the activation-time issuance stamp; fall back to createdOn for
      // keys issued at creation time (existing-authorized-domain / renewal).
      issuedAt: credential.issuedAt ?? credential.createdOn,
      expiresAt: credential.expiresAt,
      iss: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    })

    const viewedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
    await dbClient.markApiKeyCredentialViewed(credential.sortKey, viewedAt)

    logger.info('API key token viewed', {
      sortKey: credential.sortKey,
      viewedBy: session.user.email,
      operation: 'viewApiKeyToken',
    })

    return res.status(200).json({ token })
  } catch (error) {
    logger.error('Error retrieving API key token', {
      operation: 'viewApiKeyToken',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withMiddleware()(handler)
