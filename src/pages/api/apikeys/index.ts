import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import crypto from 'crypto'

function base64url(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf
  return b.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function signJwt(
  payload: Record<string, unknown>,
  secret: string,
  kid: string
): string {
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
  const kid = response.VersionId || ''
  return { secretString, kid }
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const session = await getServerSession(req, res, authOptions)
      if (!session || !session.user) {
        return res.status(401).json({ error: 'Unauthorized - Please login' })
      }

      const dbClient = await DbClientFactory.getDbClient()
      const result = await dbClient.fetchApiKeyCredentials()

      if (!result) {
        logger.error('No API key credentials returned from database', {
          operation: 'fetchApiKeyCredentials',
          httpMethod: req.method,
        })
        return res.status(500).json({ error: 'Failed to fetch API key credentials' })
      }

      return res.status(200).json(result)
    } catch (error) {
      logger.error('Error fetching API key credentials', {
        operation: 'fetchApiKeyCredentials',
        httpMethod: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'POST') {
    try {
      const session = await getServerSession(req, res, authOptions)
      if (!session || !session.user) {
        return res.status(401).json({ error: 'Unauthorized - Please login' })
      }

      const { jurisdictionId, envId, upn, description } = req.body
      if (!jurisdictionId || envId === undefined || envId === null || !upn) {
        return res.status(400).json({ error: 'jurisdictionId, envId, and upn are required' })
      }

      const envIdNum = Number(envId)
      if (isNaN(envIdNum) || envIdNum < 1 || envIdNum > 5) {
        return res.status(400).json({ error: 'envId must be a number between 1 and 5' })
      }

      const { secretString, kid } = await getJwtSigningSecret()

      const jti = crypto.randomUUID()
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 365 * 24 * 3600 * 1000)
      const iss = process.env.NEXTAUTH_URL || 'http://localhost:3000'

      const payload: Record<string, unknown> = {
        iss,
        sub: String(jurisdictionId),
        jti,
        iat: Math.floor(now.getTime() / 1000),
        exp: Math.floor(expiresAt.getTime() / 1000),
        upn: String(upn),
        roles: ['ads', 'soap'],
        env: envIdNum,
      }

      const token = signJwt(payload, secretString, kid)

      const sortKey = `${envIdNum}#${jti}`
      const createdBy = session.user.email || 'unknown'

      const dbClient = await DbClientFactory.getDbClient()
      await dbClient.createApiKeyCredential({
        jti,
        sortKey,
        jurisdictionId: String(jurisdictionId),
        env: String(envIdNum),
        status: 'active',
        createdOn: now,
        expiresAt,
        createdBy,
        description: description ? String(description) : undefined,
      })

      logger.info('API key created', {
        jti,
        sortKey,
        createdBy,
        operation: 'createApiKeyCredential',
      })

      return res.status(201).json({ token, jti, sortKey })
    } catch (error) {
      logger.error('Error creating API key credential', {
        operation: 'createApiKeyCredential',
        httpMethod: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'PATCH') {
    try {
      const session = await getServerSession(req, res, authOptions)
      if (!session || !session.user) {
        return res.status(401).json({ error: 'Unauthorized - Please login' })
      }

      const { sortKey, reason } = req.body
      if (!sortKey) {
        return res.status(400).json({ error: 'sortKey is required' })
      }

      const revokedBy = session.user.email || 'unknown'
      const revokedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

      const dbClient = await DbClientFactory.getDbClient()
      await dbClient.revokeApiKeyCredential(sortKey, revokedBy, revokedAt, reason || undefined)

      logger.info('API key revoked', {
        sortKey,
        revokedBy,
        revokedAt,
        operation: 'revokeApiKeyCredential',
      })

      return res.status(200).json({ sortKey, revokedBy, revokedAt })
    } catch (error) {
      logger.error('Error revoking API key credential', {
        operation: 'revokeApiKeyCredential',
        httpMethod: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH'])
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
}

export default withMiddleware()(handler)
