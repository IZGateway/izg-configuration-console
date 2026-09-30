import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../../../lib/api/api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const dbClient = await DbClientFactory.getDbClient()
      const result = await dbClient.fetchOrganizations()
      return res.status(200).json(result)
    } catch (error) {
      logger.error('Error fetching organizations', {
        operation: 'fetchOrganizations',
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

// Any-of: a shared lookup called from Access Control (AddDenyList,
// AccessControl/index), the Console, and Onboarding's certificate selector.
// Requiring a single capability would break two of the three callers.
// The first two alternatives are tenancy-guarded and the third is not; the
// guard is evaluated per alternative, so Jurisdiction Operations and
// Support still reach this through canViewOnboarding.
export default withMiddleware({
  capability: [
    { page: 'accesscontrol', capability: 'canViewAccessControl' },
    { page: 'console', capability: 'canViewConsole' },
    { page: 'onboarding', capability: 'canViewOnboarding' },
  ],
})(handler)
