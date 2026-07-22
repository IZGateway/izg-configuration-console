import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../../api-middleware-helper'
import logger from '../../../../../logger'
import { refreshAllHubs } from '../../../../lib/utils/izghubdbrefresh'

/**
 * @swagger
 * /api/status/refresh:
 *   post:
 *     summary: Refresh all hubs' configuration from the database.
 *     description: >
 *       Signals every configured hub to reload its configuration from the
 *       database across all Hub environments. Operations/admin users only.
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
    const result = await refreshAllHubs()

    if (result.attempted > 0 && result.succeeded === 0) {
      return res.status(502).json({
        success: false,
        error: 'Failed to signal any hub instance to refresh from the database.',
        result,
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Database refresh signaled to all hubs.',
      result,
    })
  } catch (err) {
    logger.error('Error refreshing hubs from database', {
      error: err.message,
      stack: err.stack,
      operation: 'refresh_database',
    })
    return res.status(500).json({
      success: false,
      error: 'Failed to refresh database',
    })
  }
}

export default withMiddleware('checkAdmin')(handler)
