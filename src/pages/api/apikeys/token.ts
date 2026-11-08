import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../../../lib/api/api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { getJwtSigningSecret, issueApiKeyJwt } from '../../../lib/apikeys/jwt'
import {
  isApiKeyManagementEnabled,
  scopeFromCredentialSortKeyInBody,
} from '../../../lib/security/apiKeyAuthz'
import { recordApiKeyAudit } from '../../../lib/apikeys/audit'
import { asyncRequestContext } from '../../../lib/Context'

const grantedBy = () => asyncRequestContext.getStore()?.grantedBy

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
    if (!isApiKeyManagementEnabled()) {
      return res.status(403).json({ error: 'Forbidden - feature disabled' })
    }

    const { sortKey } = req.body
    if (!sortKey) {
      return res.status(400).json({ error: 'sortKey is required' })
    }

    const dbClient = await DbClientFactory.getDbClient()
    // Role + tenancy (fix IDOR: caller must own the credential's jurisdiction
    // before its token can be reconstructed) already happened declaratively,
    // in the route's `scope` extractor, before this handler ran at all —
    // this is a second, independent read for the business logic below
    // (accepted two-reads trade-off, IGDD-3549 design.md Risks).
    const credential = await dbClient.getApiKeyCredential(String(sortKey))
    if (!credential) {
      return res.status(404).json({ error: 'API key not found' })
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
    const viewedBy = session.user.email || 'unknown'
    try {
      await dbClient.markApiKeyCredentialViewed(
        credential.sortKey,
        viewedAt,
        viewedBy
      )
    } catch (error) {
      // The earlier `credential.viewedAt` check is a stale read, not the
      // enforcement — markApiKeyCredentialViewed's own atomic condition is
      // what actually guarantees "viewed exactly once" against a concurrent
      // request. Losing that race surfaces the same 410 as the pre-check.
      if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
        return res.status(410).json({
          error: 'This token has already been viewed and cannot be retrieved again',
        })
      }
      throw error
    }

    // Revealing the token hands out a live bearer credential — the single most
    // sensitive action in this feature — so it gets a first-class audit row,
    // not just a log line. No token material is recorded, only who and when.
    await recordApiKeyAudit(dbClient, {
      changeType: 'TokenViewed',
      credentialSortKey: credential.sortKey,
      userName: viewedBy,
      context: {
        jurisdictionId: credential.jurisdictionId,
        jti: credential.jti,
        domain: credential.domain,
        grantedBy: grantedBy(),
        viewedAt,
      },
    })

    logger.info('API key token viewed', {
      sortKey: credential.sortKey,
      viewedBy,
      grantedBy: grantedBy(),
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

// IGDD-3549: declarative capability + reach, closing this route's
// `in-handler` debt row. Reads the credential's *stored* jurisdictionId
// (never one the caller could supply directly) — the same IDOR protection
// as before, now expressed as the route's declared reach requirement.
export default withMiddleware({
  capability: { page: 'apikeys', capability: 'canCreateApiKey' },
  scope: scopeFromCredentialSortKeyInBody(),
})(handler)
