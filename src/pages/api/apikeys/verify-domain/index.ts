import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../../api-middleware-helper'
import logger from '../../../../../logger'
import DbClientFactory from '../../../../lib/db/DbClientFactory'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import dns from 'dns/promises'

// DNS-verification bypass for local dev / automated tests ONLY. Requires BOTH a
// non-production NODE_ENV and an explicit opt-in flag, so it can never be turned
// on in production even by accident. When enabled, the real DNS TXT lookup is
// skipped and the challenge is treated as satisfied.
const DNS_VERIFY_BYPASS_ENABLED =
  process.env.NODE_ENV !== 'production' &&
  process.env.ALLOW_DNS_VERIFY_BYPASS === 'true'

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

    const { domain, envId, jurisdictionId, sortKey: credentialSortKey } = req.body
    if (!domain || envId === undefined || envId === null || !jurisdictionId) {
      return res.status(400).json({ error: 'domain, envId, and jurisdictionId are required' })
    }

    // DNS-name authorization is scoped per (env, jurisdiction) pair.
    const sortKey = `${envId}#${jurisdictionId}#${domain}`
    const dbClient = await DbClientFactory.getDbClient()
    const domainRecord = await dbClient.getApiKeyDomain(sortKey)

    if (!domainRecord) {
      return res
        .status(404)
        .json({ error: 'No pending challenge found for this domain' })
    }

    // Flips the credential to active. The JWT itself is never generated or
    // persisted here — it's only ever regenerated on demand, once, via
    // POST /api/apikeys/token (deterministically re-signed from the claims
    // fixed here), the first time someone actually views it.
    //
    // Expiry (and the issuance timestamp used as the JWT `iat`) are stamped
    // NOW, at activation — a DNS-challenge credential is only "issued" once it
    // becomes active, so exp is computed from issuance (1 year), not from when
    // the request record was created.
    //
    // SECURITY: the credential referenced by `credentialSortKey` MUST be the
    // pending credential that requested THIS verification. We require it to be
    // bound to the (domain, jurisdiction, env) actually verified and to still be
    // `ready_for_validation` — otherwise a verified/authorized domain could be
    // used to activate an unrelated credential (bypassing that credential's own
    // DNS-ownership requirement) or to resurrect a revoked/cancelled key. The
    // status is re-checked atomically in the DB write (`expectedStatus`).
    // Returns null on success, or an { status, error } to send to the client.
    const activateCredential = async (): Promise<{
      status: number
      error: string
    } | null> => {
      if (!credentialSortKey) return null
      const credential = await dbClient.getApiKeyCredential(String(credentialSortKey))
      if (!credential) {
        return { status: 404, error: 'Credential to activate was not found' }
      }
      const boundToVerifiedDomain =
        credential.domain === String(domain) &&
        credential.jurisdictionId === String(jurisdictionId) &&
        String(credential.env) === String(envId)
      if (!boundToVerifiedDomain) {
        logger.warn('Refused to activate credential not bound to the verified domain', {
          credentialSortKey,
          domain,
          jurisdictionId,
          envId,
          operation: 'verifyDomain',
        })
        return { status: 400, error: 'Credential does not match the verified domain' }
      }
      if (credential.status !== 'ready_for_validation') {
        return { status: 409, error: 'Credential is not awaiting validation' }
      }
      const issuedAt = new Date()
      const expiresAt = new Date(issuedAt.getTime() + 365 * 24 * 3600 * 1000)
      await dbClient.updateApiKeyCredentialStatus({
        sortKey: String(credentialSortKey),
        status: 'active',
        issuedAt: issuedAt.toISOString().replace(/\.\d{3}Z$/, 'Z'),
        expiresAt: expiresAt.toISOString().replace(/\.\d{3}Z$/, 'Z'),
        expectedStatus: 'ready_for_validation',
      })
      return null
    }

    if (domainRecord.status === 'authorized') {
      const activationError = await activateCredential()
      if (activationError) {
        return res.status(activationError.status).json({ error: activationError.error })
      }
      return res.status(200).json({ verified: true, alreadyAuthorized: true })
    }

    if (!domainRecord.challengeUuid) {
      return res.status(400).json({ error: 'No challenge UUID found' })
    }

    // Check challenge hasn't expired
    if (
      domainRecord.challengeExpiresAt &&
      new Date() > domainRecord.challengeExpiresAt
    ) {
      return res
        .status(400)
        .json({ error: 'Challenge has expired. Please start over.' })
    }

    // DNS TXT lookup
    const txtHost = `_izg-verify.${domain}`
    let records: string[][]
    try {
      if (DNS_VERIFY_BYPASS_ENABLED) {
        // Dev/test only, explicitly opted in via ALLOW_DNS_VERIFY_BYPASS (and
        // never in production — see DNS_VERIFY_BYPASS_ENABLED). Skips the real
        // DNS lookup so the success path can be exercised without owning the
        // domain. Logged as a warning so a skipped verification is auditable.
        logger.warn('DNS verification bypass ENABLED — skipping real TXT lookup', {
          domain,
          txtHost,
          validatedBy: session.user.email,
          operation: 'verifyDomain',
        })
        // Brief delay so the transient "Validation" row state is visible in the UI.
        await new Promise((resolve) => setTimeout(resolve, 3000))
        records = [[`izg-challenge=${domainRecord.challengeUuid}`]]
      } else {
        records = await dns.resolveTxt(txtHost)
      }
    } catch {
      return res.status(200).json({
        verified: false,
        error: `TXT record not found at ${txtHost}. DNS may not have propagated yet.`,
      })
    }

    const values = records.flat()
    const expected = `izg-challenge=${domainRecord.challengeUuid}`
    const match = values.includes(expected)

    if (!match) {
      return res.status(200).json({
        verified: false,
        error: `TXT record found but value did not match. Expected: ${expected}`,
      })
    }

    // Mark authorized
    const now = new Date()
    const authExpiresAt = new Date(now.getTime() + 365 * 24 * 3600 * 1000)
    await dbClient.upsertApiKeyDomain({
      sortKey,
      domain,
      env: String(envId),
      jurisdictionId: String(jurisdictionId),
      status: 'authorized',
      validatedAt: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      authExpiresAt: authExpiresAt.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    })

    logger.info('DNS domain authorized', {
      domain,
      envId,
      validatedBy: session.user.email,
      operation: 'verifyDomain',
    })

    const activationError = await activateCredential()
    if (activationError) {
      return res.status(activationError.status).json({ error: activationError.error })
    }
    return res.status(200).json({ verified: true })
  } catch (error) {
    logger.error('Error verifying domain', {
      operation: 'verifyDomain',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withMiddleware()(handler)
