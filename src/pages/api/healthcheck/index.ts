import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'

/**
 * @swagger
 * /api/healthcheck:
 *   get:
 *     summary: returns HTTP OK (200).
 *     responses:
 *       200:
 *         description: OK.
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const healthcheck = {
    status: 'Healthy',
    statusAt: new Date(Date.now()).toISOString(),
    reason: 'OK',
    uptime: process.uptime(),
  }
  try {
    logger.info('HealthCheck', { req, res, healthcheck })
    res.status(200).json(healthcheck)
  } catch (error) {
    healthcheck.status = 'Unhealthy'
    healthcheck.reason = 'Something went wrong'
    logger.info('HealthCheck', { req, res, healthcheck })
    res.status(503).json(healthcheck)
  }
}
export default withMiddleware()(handler)
