import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import hasAccessToDestId from '../../../lib/accesshelper'
import { logAccessDenied } from '../../../lib/security/accessDeniedAudit'
import { subjectOf } from '../../../lib/security/authzsubject'
import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'
import { assertSafeDestinationUri } from '../../../lib/security/assertSafeDestinationUri'
import { UnsafeDestinationUriError } from '../../../lib/security/destinationUriGuard'

/**
 * @swagger
 * /api/destinationuri/validate:
 *   post:
 *     summary: Check a destination URI against the destination URL specification.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             destId: string
 *             destTypeId: number
 *             destUri: string
 *     responses:
 *       200:
 *         description: The URI is a permitted destination.
 *       400:
 *         description: The URI is not a permitted destination; `error` explains why.
 */

/**
 * Exists so the edit form can apply the *real* guard before advancing a step,
 * rather than re-implementing it in the browser. Two of the guard's rules
 * cannot be checked client-side at all (the port allowlist is environment
 * configurable and the publicly-routable rule needs DNS), and duplicating the
 * approved-TLD allowlist in the client would let the two definitions drift -
 * which is the failure mode that let an unapproved URI through change control
 * in the first place.
 *
 * This is advisory only. `POST /api/changerequest` re-runs the same guard, so a
 * caller skipping this endpoint gains nothing.
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: `Method ${req.method} not allowed.` })
    return
  }

  const body =
    typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const { destId, destTypeId, destUri } = body
  const session = await getServerSession(req, res, authOptions)

  if (!hasAccessToDestId(destId, session)) {
    logAccessDenied({
      reason: 'caller has no access to destination',
      url: req.url,
      method: req.method,
      user: session?.user?.email,
      roles: subjectOf(session).roles,
      destId,
    })
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  if (!destUri) {
    res.status(400).json({ error: 'A destination URL is required.' })
    return
  }

  try {
    await assertSafeDestinationUri(destUri, destTypeId)
  } catch (error) {
    if (!(error instanceof UnsafeDestinationUriError)) {
      throw error
    }
    logger.info('Destination URI failed validation', {
      destId,
      destUri,
      userId: session?.user?.email,
      reason: error.message,
      operation: 'validate_destination_uri',
    })
    res.status(400).json({ error: error.message })
    return
  }

  res.status(200).json({ valid: true })
}

export default withMiddleware()(handler)
