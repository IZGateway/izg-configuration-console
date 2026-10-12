import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../../../lib/api/api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { subjectOf } from '../../../lib/security/authzsubject'
import { hasGlobalTenancy } from '../../../lib/security/policy'

/**
 * @swagger
 * /api/destinations:
 *   get:
 *     summary: Get all destinations accessible to the logged-in user
 *     responses:
 *       200:
 *         description: List of destinations
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const session = await getServerSession(req, res, authOptions)

      if (!session?.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      // Reach comes from the role matrix, not from `isAdmin` (membership of the
      // `OPERATIONS_GROUP` Okta group, which only IZG Operations holds). This
      // read pairs no capability, so a plain union across held roles is
      // correct: if any held role is globally scoped, the caller reaches every
      // row. Same reasoning as the single-row check in accesshelper.ts:9-17 —
      // there is no capability here for a scoped role to borrow reach for, so
      // this is not the PR #700 leak (capability + unrelated role's reach).
      const subject = subjectOf(session)
      const hasGlobalReach = hasGlobalTenancy(subject)
      const jurisdictions = session.user.jurisdictions || []

      const dbClient = await DbClientFactory.getDbClient()
      const result = await dbClient.fetchLoggedInUsersDestinations(
        hasGlobalReach,
        jurisdictions
      )

      return res.status(200).json(result)
    } catch (error) {
      logger.error('Error fetching destinations', {
        operation: 'fetchDestinations',
        httpMethod: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  res.setHeader('Allow', ['GET'])
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
}

// Handler row-filters the destination list by the caller's reach.
export default withMiddleware({ session: true })(handler)
