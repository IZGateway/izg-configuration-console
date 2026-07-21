import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../../api-middleware-helper'
import logger from '../../../../../logger'
import { resetAllCircuitBreakers } from '../../../../lib/utils/izghubcircuitbreakerreset'

/**
 * @swagger
 * /api/status/reset:
 *   post:
 *     summary: Reset all circuit breakers across all Hub environments.
 *     description: >
 *       Signals every configured hub to reset all of its circuit breakers so
 *       connections recover without a service restart. Operations/admin users
 *       only.
 *     responses:
 *       200:
 *         description: OK.
 *       403:
 *         description: Forbidden (non-admin).
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const result = await resetAllCircuitBreakers()

    // Treat a total failure (every hub unreachable) as an error; partial success
    // still reports 200 so the operator sees that some hubs responded.
    if (result.attempted > 0 && result.succeeded === 0) {
      return res.status(502).json({
        success: false,
        error: 'Failed to signal any hub instance to reset circuit breakers.',
        result,
      })
    }

    return res.status(200).json({
      success: true,
      message: 'All circuit breakers reset.',
      result,
    })
  } catch (err) {
    logger.error('Error resetting circuit breakers', {
      error: err.message,
      stack: err.stack,
      operation: 'reset_circuit_breakers',
    })
    return res.status(500).json({
      success: false,
      error: 'Failed to reset circuit breakers',
    })
  }
}

export default withMiddleware('checkAdmin')(handler)
