import crypto from 'crypto'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

function base64url(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf
  return b.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function signJwt(
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

export async function getJwtSigningSecret(): Promise<{ secretString: string; kid: string }> {
  const secretId = process.env.JWT_SIGNING_SECRET_ID
  if (!secretId) throw new Error('JWT_SIGNING_SECRET_ID env var not set')
  const client = new SecretsManagerClient({})
  const response = await client.send(new GetSecretValueCommand({ SecretId: secretId }))
  const secretString = response.SecretString
  if (!secretString) throw new Error('Secret has no SecretString value')
  const kid = response.VersionId || ''
  return { secretString, kid }
}

export function issueApiKeyJwt(params: {
  jurisdictionId: string
  jti: string
  upn: string
  envId: number
  secretString: string
  kid: string
  issuedAt: Date
  expiresAt: Date
  iss: string
}): string {
  const payload: Record<string, unknown> = {
    iss: params.iss,
    sub: String(params.jurisdictionId),
    jti: params.jti,
    iat: Math.floor(params.issuedAt.getTime() / 1000),
    exp: Math.floor(params.expiresAt.getTime() / 1000),
    upn: params.upn,
    roles: ['ads', 'soap'],
    env: params.envId,
  }
  return signJwt(payload, params.secretString, params.kid)
}
