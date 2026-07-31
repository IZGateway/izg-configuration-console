import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../../api-middleware-helper'
import logger from '../../../../../logger'
import DbClientFactory from '../../../../lib/db/DbClientFactory'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import crypto from 'crypto'

/** Add N business days (Mon–Fri) to a date, excluding the start date. */
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dow = result.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return result
}

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

    // Note: `upn` (DNS domain) is intentionally NOT read from the request body.
    // A renewal must keep the same domain as the credential being renewed, so
    // the domain is sourced from the stored credential below — the client
    // cannot redirect a renewal to a different domain.
    const { oldSortKey, oldExpiresAt, jurisdictionId, envId, description } = req.body
    if (!oldSortKey || !jurisdictionId || envId === undefined || envId === null) {
      return res.status(400).json({ error: 'oldSortKey, jurisdictionId, and envId are required' })
    }

    const envIdNum = Number(envId)
    if (isNaN(envIdNum) || envIdNum < 1 || envIdNum > 5) {
      return res.status(400).json({ error: 'envId must be a number between 1 and 5' })
    }

    const dbClient = await DbClientFactory.getDbClient()

    // Renewal is valid only from an active credential (per the state machine).
    const oldCredential = await dbClient.getApiKeyCredential(String(oldSortKey))
    if (!oldCredential) {
      return res.status(404).json({ error: 'Credential to renew was not found' })
    }
    if (oldCredential.status !== 'active') {
      return res.status(409).json({ error: 'Only active credentials can be renewed' })
    }

    // The renewed key inherits the DNS domain (JWT upn) from the credential
    // being renewed — the server, not the client, is authoritative here.
    const domain = oldCredential.domain
    if (!domain) {
      return res.status(409).json({
        error: 'The credential being renewed has no DNS domain on record and cannot be renewed',
      })
    }

    const newJti = crypto.randomUUID()
    const now = new Date()
    const ONE_YEAR_MS = 365 * 24 * 3600 * 1000
    const THIRTY_DAYS_MS = 30 * 24 * 3600 * 1000

    // Base the new expiry on the credential's stored expiry (server-authoritative),
    // falling back to the client-supplied value only if it is missing.
    // Within 30 days of old expiry → extend 1 year from old expiry date;
    // more than 30 days before → 1 year from today.
    const oldExpirySource =
      oldCredential.expiresAt ?? (oldExpiresAt ? new Date(oldExpiresAt) : null)
    let expiresAt: Date
    if (oldExpirySource) {
      const oldExpiry = new Date(oldExpirySource)
      const withinGracePeriod = now >= new Date(oldExpiry.getTime() - THIRTY_DAYS_MS)
      expiresAt = withinGracePeriod
        ? new Date(oldExpiry.getTime() + ONE_YEAR_MS)
        : new Date(now.getTime() + ONE_YEAR_MS)
    } else {
      expiresAt = new Date(now.getTime() + ONE_YEAR_MS)
    }
    const graceExpiresAt = addBusinessDays(now, 10)
    const renewedBy = session.user.email || 'unknown'
    const renewedAt = now.toISOString().replace(/\.\d{3}Z$/, 'Z')
    const newSortKey = `${envIdNum}#${newJti}`

    // Create the new key record. The JWT itself is never generated/persisted
    // here — it's regenerated on demand, once, via POST /api/apikeys/token.
    await dbClient.createApiKeyCredential({
      jti: newJti,
      sortKey: newSortKey,
      jurisdictionId: String(jurisdictionId),
      env: String(envIdNum),
      status: 'active',
      createdOn: now,
      expiresAt,
      createdBy: renewedBy,
      description: description ? String(description) : undefined,
      domain,
      // Carry the sender's use-type scope forward to the renewed credential.
      useTypes: oldCredential.useTypes,
    })

    // Transition the old key to grace: both old and new remain valid until
    // graceExpiresAt so dependent systems can roll over without disruption.
    await dbClient.supersedApiKeyCredential({
      sortKey: oldSortKey,
      renewedBy,
      renewedAt,
      graceExpiresAt: graceExpiresAt.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      supersededBy: newJti,
    })

    logger.info('API key renewed', {
      oldSortKey,
      newJti,
      newSortKey,
      renewedBy,
      graceExpiresAt: graceExpiresAt.toISOString(),
      operation: 'renewApiKeyCredential',
    })

    return res.status(201).json({ jti: newJti, sortKey: newSortKey })
  } catch (error) {
    logger.error('Error renewing API key credential', {
      operation: 'renewApiKeyCredential',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withMiddleware()(handler)
