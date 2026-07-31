import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { isValidUseType } from '../../../lib/type/AllowedUseType'
import crypto from 'crypto'

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

      const { jurisdictionId, envId, upn, description, dnsChoice, useTypes } = req.body
      if (!jurisdictionId || envId === undefined || envId === null || !upn) {
        return res.status(400).json({ error: 'jurisdictionId, envId, and upn are required' })
      }
      if (dnsChoice !== 'existing' && dnsChoice !== 'other') {
        return res.status(400).json({ error: "dnsChoice must be 'existing' or 'other'" })
      }

      const envIdNum = Number(envId)
      if (isNaN(envIdNum) || envIdNum < 1 || envIdNum > 5) {
        return res.status(400).json({ error: 'envId must be a number between 1 and 5' })
      }

      // useTypes scopes the credential to submitter categories; it is required
      // and every value must be a known enum. (Server-side property, not a JWT
      // claim — the Hub reads it by jti at routing time.)
      if (!Array.isArray(useTypes) || useTypes.length === 0) {
        return res.status(400).json({ error: 'useTypes must be a non-empty array' })
      }
      if (!useTypes.every(isValidUseType)) {
        return res.status(400).json({
          error: 'useTypes may only contain PATIENT, PROVIDER, or PUBLIC_HEALTH',
        })
      }

      const dbClient = await DbClientFactory.getDbClient()
      // DNS-name authorization is scoped per (env, jurisdiction) pair —
      // a domain authorized for one jurisdiction must not be selectable
      // as "existing" under a different jurisdiction.
      const domainSortKey = `${envIdNum}#${jurisdictionId}#${upn}`
      const now = new Date()
      const createdBy = session.user.email || 'unknown'

      if (dnsChoice === 'existing') {
        const domainRecord = await dbClient.getApiKeyDomain(domainSortKey)
        const isAuthorized =
          domainRecord?.status === 'authorized' &&
          domainRecord?.authExpiresAt &&
          new Date(domainRecord.authExpiresAt) > now
        if (!isAuthorized) {
          return res.status(400).json({ error: 'Selected DNS name is not currently authorized' })
        }

        const jti = crypto.randomUUID()
        const expiresAt = new Date(now.getTime() + 365 * 24 * 3600 * 1000)
        const sortKey = `${envIdNum}#${jti}`
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
          domain: String(upn),
          useTypes,
        })

        logger.info('API key created for existing authorized domain', {
          jti,
          sortKey,
          createdBy,
          operation: 'createApiKeyCredential',
        })

        return res.status(201).json({ jti, sortKey })
      }

      // dnsChoice === 'other' — create the credential row up front as
      // ready_for_validation. No expiry is set yet: the key is not "issued"
      // until DNS ownership is verified, and exp is stamped at activation
      // (verify-domain) so it is computed from issuance.
      const jti = crypto.randomUUID()
      const sortKey = `${envIdNum}#${jti}`

      await dbClient.createApiKeyCredential({
        jti,
        sortKey,
        jurisdictionId: String(jurisdictionId),
        env: String(envIdNum),
        status: 'ready_for_validation',
        createdOn: now,
        createdBy,
        description: description ? String(description) : undefined,
        domain: String(upn),
        useTypes,
      })

      const domainRecord = await dbClient.getApiKeyDomain(domainSortKey)
      const hasPendingChallenge =
        domainRecord?.status === 'pending_challenge' &&
        domainRecord?.challengeExpiresAt &&
        new Date(domainRecord.challengeExpiresAt) > now

      const challengeUuid = hasPendingChallenge
        ? domainRecord.challengeUuid
        : crypto.randomUUID()

      if (!hasPendingChallenge) {
        const challengeExpiresAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000)
        await dbClient.upsertApiKeyDomain({
          sortKey: domainSortKey,
          domain: String(upn),
          env: String(envIdNum),
          jurisdictionId: String(jurisdictionId),
          status: 'pending_challenge',
          challengeUuid,
          challengeExpiresAt: challengeExpiresAt.toISOString().replace(/\.\d{3}Z$/, 'Z'),
          requestedBy: createdBy,
          authExpiresAt: '',
        })
      }

      logger.info('DNS challenge required for new domain; credential created as ready_for_validation', {
        domain: upn,
        envId: envIdNum,
        challengeUuid,
        jti,
        sortKey,
        operation: 'createApiKeyCredential',
      })

      return res.status(202).json({
        status: 'ready_for_validation',
        domain: upn,
        envId: envIdNum,
        challengeUuid,
        jti,
        sortKey,
        txtRecord: `_izg-verify.${upn}`,
        txtValue: `izg-challenge=${challengeUuid}`,
      })
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

      const dbClient = await DbClientFactory.getDbClient()

      // Revoke is valid only from active or grace (per the credential state
      // machine). Pending (ready_for_validation) keys are cancelled, not
      // revoked; a revoked key is terminal. `grace_period` is the current grace
      // status (Hub-aligned, IGDD-2711); `grace`/`superseded` are older values
      // tolerated for backward compatibility with pre-existing records.
      const credential = await dbClient.getApiKeyCredential(String(sortKey))
      if (!credential) {
        return res.status(404).json({ error: 'API key not found' })
      }
      const revocableStatuses = ['active', 'grace_period', 'grace', 'superseded']
      if (!revocableStatuses.includes(credential.status)) {
        return res.status(409).json({
          error:
            'Only active or grace-period credentials can be revoked. Pending credentials should be cancelled instead.',
        })
      }

      const revokedBy = session.user.email || 'unknown'
      const revokedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

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

  if (req.method === 'DELETE') {
    try {
      const session = await getServerSession(req, res, authOptions)
      if (!session || !session.user) {
        return res.status(401).json({ error: 'Unauthorized - Please login' })
      }

      const { sortKey } = req.body
      if (!sortKey) {
        return res.status(400).json({ error: 'sortKey is required' })
      }

      const dbClient = await DbClientFactory.getDbClient()

      // Cancel = soft-cancel, permitted only while the credential is still
      // pending DNS validation. The record is RETAINED (status 'cancelled')
      // for audit rather than deleted. Active/grace credentials must be
      // revoked instead.
      const credential = await dbClient.getApiKeyCredential(String(sortKey))
      if (!credential) {
        return res.status(404).json({ error: 'API key not found' })
      }
      if (credential.status !== 'ready_for_validation') {
        return res.status(409).json({
          error:
            'Only pending (ready for validation) credentials can be cancelled. Active or grace-period credentials must be revoked instead.',
        })
      }

      const cancelledBy = session.user.email || 'unknown'
      const cancelledAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

      await dbClient.cancelApiKeyCredential(String(sortKey), cancelledBy, cancelledAt)

      logger.info('API key cancelled (soft; record retained for audit)', {
        sortKey,
        cancelledBy,
        cancelledAt,
        operation: 'cancelApiKeyCredential',
      })

      return res.status(200).json({ sortKey, cancelled: true })
    } catch (error) {
      logger.error('Error cancelling API key credential', {
        operation: 'cancelApiKeyCredential',
        httpMethod: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE'])
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
}

export default withMiddleware()(handler)
