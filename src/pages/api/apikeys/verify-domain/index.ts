import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../../api-middleware-helper'
import logger from '../../../../../logger'
import DbClientFactory from '../../../../lib/db/DbClientFactory'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { requireApiKeyAccess } from '../../../../lib/security/apiKeyAuthz'
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
    if (!domain || !jurisdictionId) {
      return res.status(400).json({ error: 'domain and jurisdictionId are required' })
    }
    // Role + tenancy: verifying a domain authorizes it and activates the
    // pending credential, so it is gated on the mint capability
    // (`canCreateApiKey`); a caller may only authorize/activate domains for a
    // jurisdiction they own.
    const authz = await requireApiKeyAccess(session, 'canCreateApiKey', jurisdictionId)
    if (!authz.ok) {
      return res.status(authz.status).json({ error: authz.error })
    }

    const dbClient = await DbClientFactory.getDbClient()

    // SECURITY: the credential referenced by `credentialSortKey` MUST be the
    // pending credential that requested THIS verification. We require it to be
    // bound to the (domain, jurisdiction) actually verified and to still be
    // `ready_for_validation` — otherwise a verified/authorized domain could be
    // used to activate an unrelated credential (bypassing that credential's own
    // DNS-ownership requirement) or to resurrect a revoked/cancelled key.
    //
    // The environment(s) to authorize come from the credential itself (a
    // multi-env credential's `environments` list is server-authoritative), NOT
    // from a client-supplied `envId` — otherwise a caller could claim envs its
    // own credential was never created for. `envId` is only used as a fallback
    // when there is no credential to activate (domain-only verification).
    let environments: number[]
    let credential: Awaited<ReturnType<typeof dbClient.getApiKeyCredential>> = null
    if (credentialSortKey) {
      credential = await dbClient.getApiKeyCredential(String(credentialSortKey))
      if (!credential) {
        return res.status(404).json({ error: 'Credential to activate was not found' })
      }
      const boundToVerifiedDomain =
        credential.domain === String(domain) &&
        credential.jurisdictionId === String(jurisdictionId)
      if (!boundToVerifiedDomain) {
        logger.warn('Refused to activate credential not bound to the verified domain', {
          credentialSortKey,
          domain,
          jurisdictionId,
          operation: 'verifyDomain',
        })
        return res.status(400).json({ error: 'Credential does not match the verified domain' })
      }
      if (credential.status !== 'ready_for_validation') {
        return res.status(409).json({ error: 'Credential is not awaiting validation' })
      }
      environments = credential.environments
    } else {
      if (envId === undefined || envId === null) {
        return res.status(400).json({ error: 'envId or sortKey is required' })
      }
      environments = [Number(envId)]
    }

    // DNS-name authorization is scoped per (env, jurisdiction) pair, so a
    // multi-env credential needs one ApiKeyDomain row per environment. The TXT
    // challenge itself proves ownership of the domain (env-independent), so a
    // single successful lookup authorizes every environment still pending.
    const domainSortKeys = environments.map((env) => `${env}#${jurisdictionId}#${domain}`)
    const domainRecords = await Promise.all(
      domainSortKeys.map((sk) => dbClient.getApiKeyDomain(sk))
    )
    const now = new Date()
    // An 'authorized' record whose authExpiresAt has passed must NOT short-
    // circuit activation — otherwise a stale authorization could activate a
    // credential without re-proving DNS ownership. Matches the same
    // status+expiry check already used by the create route's 'existing
    // domain' path.
    const isAuthorizedRecord = (rec: (typeof domainRecords)[number]) =>
      rec?.status === 'authorized' &&
      !!rec?.authExpiresAt &&
      new Date(rec.authExpiresAt) > now
    const pendingIndexes = environments
      .map((_, i) => i)
      .filter((i) => !isAuthorizedRecord(domainRecords[i]))

    // Flips the credential to active. The JWT itself is never generated or
    // persisted here — it's only ever regenerated on demand, once, via
    // POST /api/apikeys/token (deterministically re-signed from the claims
    // fixed here), the first time someone actually views it.
    //
    // Expiry (and the issuance timestamp used as the JWT `iat`) are stamped
    // NOW, at activation — a DNS-challenge credential is only "issued" once it
    // becomes active, so exp is computed from issuance (1 year), not from when
    // the request record was created. The bind/status checks already ran above,
    // but status is re-checked atomically in the DB write (`expectedStatus`).
    const activateCredential = async (): Promise<{
      status: number
      error: string
    } | null> => {
      if (!credential) return null
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

    if (pendingIndexes.length === 0) {
      // Every one of the credential's (or the single requested) environments
      // is already authorized for this domain — nothing left to verify.
      const activationError = await activateCredential()
      if (activationError) {
        return res.status(activationError.status).json({ error: activationError.error })
      }
      return res.status(200).json({ verified: true, alreadyAuthorized: true })
    }

    // Find a still-valid pending challenge among the environments that still
    // need authorization. Every environment's row shares the same challenge
    // UUID (see POST /api/apikeys), so any one of them is representative.
    const challengeRecord = pendingIndexes
      .map((i) => domainRecords[i])
      .find((rec) => rec?.challengeUuid)

    if (!challengeRecord) {
      return res
        .status(404)
        .json({ error: 'No pending challenge found for this domain' })
    }

    if (
      challengeRecord.challengeExpiresAt &&
      new Date() > new Date(challengeRecord.challengeExpiresAt)
    ) {
      return res
        .status(400)
        .json({ error: 'Challenge has expired. Please start over.' })
    }

    // DNS TXT lookup at the domain APEX (DigiCert-style domain validation) —
    // not a `_izg-verify.` subdomain — and env-independent, so this runs once
    // regardless of how many environments are pending.
    const txtHost = domain
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
        records = [[`izg-challenge=${challengeRecord.challengeUuid}`]]
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
    const expected = `izg-challenge=${challengeRecord.challengeUuid}`
    const match = values.includes(expected)

    if (!match) {
      return res.status(200).json({
        verified: false,
        error: `TXT record found but value did not match. Expected: ${expected}`,
      })
    }

    // GLOBAL domain exclusivity: a domain belongs to exactly one jurisdiction
    // across every environment, so ownership is claimed once per domain here
    // (not per pending environment) via a race-safe conditional write. A
    // domain already owned by a different jurisdiction is rejected even
    // though the DNS TXT check just passed — proving you can add a TXT
    // record doesn't override another sender's prior claim to this domain.
    const ownership = await dbClient.claimDomainOwnership(domain, String(jurisdictionId))
    if (!ownership.claimed) {
      logger.warn('Refused to authorize domain already owned by another jurisdiction', {
        domain,
        requestingJurisdictionId: jurisdictionId,
        ownerJurisdictionId: ownership.ownerJurisdictionId,
        operation: 'verifyDomain',
      })
      return res.status(409).json({
        error: 'This domain is already authorized for another organization.',
      })
    }

    // Mark authorized — every environment that was still pending, all sharing
    // the same authorization expiry.
    const authExpiresAt = new Date(now.getTime() + 365 * 24 * 3600 * 1000)
    await Promise.all(
      pendingIndexes.map((i) =>
        dbClient.upsertApiKeyDomain({
          sortKey: domainSortKeys[i],
          domain,
          env: environments[i],
          jurisdictionId: String(jurisdictionId),
          status: 'authorized',
          validatedAt: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
          authExpiresAt: authExpiresAt.toISOString().replace(/\.\d{3}Z$/, 'Z'),
        })
      )
    )

    logger.info('DNS domain authorized', {
      domain,
      environments,
      validatedBy: session.user.email,
      grantedBy: authz.grantedBy,
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
