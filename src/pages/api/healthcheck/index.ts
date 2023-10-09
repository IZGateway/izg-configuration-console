import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const healthcheck = {
    status: 'Healthy',
    statusAt: new Date(Date.now()).toISOString(),
    reason: 'OK',
    uptime: process.uptime(),
  }
  try {
    res.status(200).json(healthcheck)
    logger.info(JSON.stringify(healthcheck))
  } catch (error) {
    healthcheck.status = 'Unhealthy'
    healthcheck.reason = 'Something went wrong'
    res.status(503).json(healthcheck)
  }
}
export default withMiddleware()(handler)
