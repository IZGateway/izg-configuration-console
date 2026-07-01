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

    const { domain, envId } = req.body
    if (!domain || envId === undefined || envId === null) {
      return res.status(400).json({ error: 'domain and envId are required' })
    }

    const sortKey = `${envId}#${domain}`
    const dbClient = await DbClientFactory.getDbClient()
    const domainRecord = await dbClient.getApiKeyDomain(sortKey)

    if (!domainRecord) {
      return res.status(404).json({ error: 'No pending challenge found for this domain' })
    }

    if (domainRecord.status === 'authorized') {
      return res.status(200).json({ verified: true, alreadyAuthorized: true })
    }

    if (!domainRecord.challengeUuid) {
      return res.status(400).json({ error: 'No challenge UUID found' })
    }

    // Check challenge hasn't expired
    if (domainRecord.challengeExpiresAt && new Date() > domainRecord.challengeExpiresAt) {
      return res.status(400).json({ error: 'Challenge has expired. Please start over.' })
    }

    // DNS TXT lookup
    const txtHost = `_izg-verify.${domain}`
    let records: string[][]
    try {
      records = await dns.resolveTxt(txtHost)
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
