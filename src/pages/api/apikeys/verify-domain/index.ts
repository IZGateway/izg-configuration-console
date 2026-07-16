import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../../api-middleware-helper'
import logger from '../../../../../logger'
import DbClientFactory from '../../../../lib/db/DbClientFactory'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import dns from 'dns/promises'

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

    const { domain, envId, sortKey: credentialSortKey } = req.body
    if (!domain || envId === undefined || envId === null) {
      return res.status(400).json({ error: 'domain and envId are required' })
    }

    const sortKey = `${envId}#${domain}`
    const dbClient = await DbClientFactory.getDbClient()
    const domainRecord = await dbClient.getApiKeyDomain(sortKey)

    if (!domainRecord) {
      return res
        .status(404)
        .json({ error: 'No pending challenge found for this domain' })
    }

    // Flips the credential to active. The JWT itself is never generated or
    // persisted here — it's only ever regenerated on demand, once, via
    // POST /api/apikeys/token (deterministically re-signed from claims fixed
    // at creation time), the first time someone actually views it.
    const activateCredential = async (): Promise<void> => {
      if (!credentialSortKey) return
      await dbClient.updateApiKeyCredentialStatus({
        sortKey: String(credentialSortKey),
        status: 'active',
      })
    }

    if (domainRecord.status === 'authorized') {
      await activateCredential()
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
      if (process.env.NODE_ENV === 'development') {
        // LOCAL DEV ONLY — bypasses the real DNS lookup so you can exercise
        // the success path without owning/controlling the test domain.
        // Artificial delay so the transient "Validation" row state is
        // actually visible in the UI. REVERT BEFORE COMMITTING.
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

    await activateCredential()
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
