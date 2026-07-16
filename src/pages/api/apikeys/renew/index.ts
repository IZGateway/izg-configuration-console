import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../../api-middleware-helper'
import logger from '../../../../../logger'
import DbClientFactory from '../../../../lib/db/DbClientFactory'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import crypto from 'crypto'

function base64url(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf
  return b.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function signJwt(payload: Record<string, unknown>, secret: string, kid: string): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid }))
  const body = base64url(JSON.stringify(payload))
  const signingInput = `${header}.${body}`
  const sig = crypto
    .createHmac('sha256', Buffer.from(secret, 'utf8'))
    .update(signingInput)
    .digest()
  return `${signingInput}.${base64url(sig)}`
}

async function getJwtSigningSecret(): Promise<{ secretString: string; kid: string }> {
  const secretId = process.env.JWT_SIGNING_SECRET_ID
  if (!secretId) throw new Error('JWT_SIGNING_SECRET_ID env var not set')
  const client = new SecretsManagerClient({})
  const response = await client.send(new GetSecretValueCommand({ SecretId: secretId }))
  const secretString = response.SecretString
  if (!secretString) throw new Error('Secret has no SecretString value')
  return { secretString, kid: response.VersionId || '' }
}

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

    const { oldSortKey, oldExpiresAt, jurisdictionId, envId, upn, description } = req.body
    if (!oldSortKey || !jurisdictionId || envId === undefined || envId === null || !upn) {
      return res.status(400).json({ error: 'oldSortKey, jurisdictionId, envId, and upn are required' })
    }

    const envIdNum = Number(envId)
    if (isNaN(envIdNum) || envIdNum < 1 || envIdNum > 5) {
      return res.status(400).json({ error: 'envId must be a number between 1 and 5' })
    }

    const { secretString, kid } = await getJwtSigningSecret()

    const newJti = crypto.randomUUID()
    const now = new Date()
    const ONE_YEAR_MS = 365 * 24 * 3600 * 1000
    const THIRTY_DAYS_MS = 30 * 24 * 3600 * 1000

    // Within 30 days of old expiry → extend 1 year from old expiry date
    // More than 30 days before old expiry → 1 year from today
    let expiresAt: Date
    if (oldExpiresAt) {
      const oldExpiry = new Date(oldExpiresAt)
      const withinGracePeriod = now >= new Date(oldExpiry.getTime() - THIRTY_DAYS_MS)
      expiresAt = withinGracePeriod
        ? new Date(oldExpiry.getTime() + ONE_YEAR_MS)
        : new Date(now.getTime() + ONE_YEAR_MS)
    } else {
      expiresAt = new Date(now.getTime() + ONE_YEAR_MS)
    }
    const graceExpiresAt = addBusinessDays(now, 10)
    const iss = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const renewedBy = session.user.email || 'unknown'
    const renewedAt = now.toISOString().replace(/\.\d{3}Z$/, 'Z')

    const payload: Record<string, unknown> = {
      iss,
      sub: String(jurisdictionId),
      jti: newJti,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
      upn: String(upn),
      roles: ['ads', 'soap'],
      env: envIdNum,
    }

    const token = signJwt(payload, secretString, kid)
    const newSortKey = `${envIdNum}#${newJti}`

    const dbClient = await DbClientFactory.getDbClient()

    // Create the new key record
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
    })

    // Mark old key as superseded with grace period
    await dbClient.supersedApiKeyCredential({
      sortKey: oldSortKey,
      renewedBy,
      renewedAt,
      graceExpiresAt: graceExpiresAt.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      supersededByJti: newJti,
    })

    logger.info('API key renewed', {
      oldSortKey,
      newJti,
      newSortKey,
      renewedBy,
      graceExpiresAt: graceExpiresAt.toISOString(),
      operation: 'renewApiKeyCredential',
    })

    return res.status(201).json({ token, jti: newJti, sortKey: newSortKey })
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
