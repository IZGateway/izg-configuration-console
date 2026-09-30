import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../../../lib/api/api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const dbClient = await DbClientFactory.getDbClient()
    const result = await dbClient.fetchSenderData()
    if (result) {
      res.json(result)
    } else {
      logger.error('Database lookup failed for sender data', {
        operation: 'fetchSenderData',
        httpMethod: req.method,
      })
      res.status(500)
    }
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}
// Verified zero callers in src/. Proposed for deletion; gated rather than
// removed here because deletion is a product call, not a security one.
export default withMiddleware({
  capability: { page: 'accesscontrol', capability: 'canViewAccessControl' },
})(handler)
