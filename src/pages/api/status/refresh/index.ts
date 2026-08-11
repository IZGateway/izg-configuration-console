import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../../api-middleware-helper'
import logger from '../../../../../logger'
import {
  refreshAllHubs,
  refreshHubForEnvironment,
} from '../../../../lib/utils/izghubdbrefresh'

/**
 * @swagger
 * /api/status/refresh:
 *   post:
 *     summary: Refresh hub configuration from the database.
 *     description: >
 *       Signals a configured hub environment, or every configured hub when no
 *       destinationTypeId is provided, to reload its configuration from the
 *       database. Operations/admin users only.
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
    const hasDestinationTypeId =
      req.body &&
      Object.prototype.hasOwnProperty.call(req.body, 'destinationTypeId')
    const destinationTypeId = Number(req.body?.destinationTypeId)
    const isEnvironmentRefresh =
      hasDestinationTypeId &&
      Number.isInteger(destinationTypeId) &&
      destinationTypeId > 0

    if (hasDestinationTypeId && !isEnvironmentRefresh) {
      return res.status(400).json({
        success: false,
        error: 'A valid destinationTypeId is required.',
      })
    }

    const result = isEnvironmentRefresh
      ? await refreshHubForEnvironment(destinationTypeId)
      : await refreshAllHubs()

    if (result.attempted > 0 && result.succeeded === 0) {
      return res.status(502).json({
        success: false,
        error: isEnvironmentRefresh
          ? 'Failed to signal the hub instance to refresh from the database.'
          : 'Failed to signal any hub instance to refresh from the database.',
        result,
      })
    }

    return res.status(200).json({
      success: true,
      message: isEnvironmentRefresh
        ? 'Database refresh signaled for the selected environment.'
        : 'Database refresh signaled to all hubs.',
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
