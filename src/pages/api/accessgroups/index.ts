import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const dbClient = await DbClientFactory.getDbClient()
    const result = await dbClient.fetchAccessGroups()
    if (result) {
      res.json(result)
    } else {
      logger.error('Database lookup failed for access groups', {
        operation: 'fetchAccessGroups',
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
export default withMiddleware()(handler)
