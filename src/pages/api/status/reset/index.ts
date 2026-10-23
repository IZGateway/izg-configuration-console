import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../../../../lib/api/api-middleware-helper'
import logger from '../../../../../logger'
import {
  resetAllCircuitBreakers,
  resetCircuitBreakersForEnvironment,
} from '../../../../lib/utils/izghubcircuitbreakerreset'
import {
  hubOperationLevel,
  regionsNotComplete,
} from '../../../../lib/utils/hubregionstatus'

/**
 * @swagger
 * /api/status/reset:
 *   post:
 *     summary: Reset all circuit breakers across all Hub environments.
 *     description: >
 *       Signals every configured hub to reset all of its circuit breakers so
 *       connections recover without a service restart. Operations/admin users
 *       only. The hub clears the breakers on every instance in every region
 *       and reports the outcome per region in `result.regions`, whose values
 *       are `complete`, `partial` or `failed`. That block is absent against a
 *       hub release older than IGDD-3599, and absent when no
 *       `destinationTypeId` is given, because several hubs are then called and
 *       their region keys collide. Hub host names are never returned.
 *     responses:
 *       200:
 *         description: >
 *           The hub was reached. `success` is true only when every region
 *           reports `complete`; a `partial` region returns 200 with
 *           `success: false` and a message naming the region.
 *       403:
 *         description: Forbidden (non-admin).
 *       502:
 *         description: >
 *           No hub instance reset its circuit breakers. Returned when every
 *           hub endpoint was unreachable, or when every region reports
 *           `failed`. The body still carries `result.regions`.
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
    const isEnvironmentReset =
      hasDestinationTypeId &&
      Number.isInteger(destinationTypeId) &&
      destinationTypeId > 0

    if (hasDestinationTypeId && !isEnvironmentReset) {
      return res.status(400).json({
        success: false,
        error: 'A valid destinationTypeId is required.',
      })
    }

    const result = isEnvironmentReset
      ? await resetCircuitBreakersForEnvironment(destinationTypeId)
      : await resetAllCircuitBreakers()

    // Treat a total failure (every hub unreachable) as an error; partial success
    // still reports 200 so the operator sees that some hubs responded.
    if (result.attempted > 0 && result.succeeded === 0) {
      return res.status(502).json({
        success: false,
        error: isEnvironmentReset
          ? 'Failed to signal the hub instance to reset circuit breakers.'
          : 'Failed to signal any hub instance to reset circuit breakers.',
        result,
      })
    }

    // IGDD-3599: the hub answers 200 even when a region did not fully reset, so
    // the HTTP status cannot decide this. `level` is undefined against a hub
    // that sends no `regions` block, which keeps the pre-IGDD-3599 wording.
    const level = hubOperationLevel(result.regions)
    const unfinished = regionsNotComplete(result.regions)

    if (level === 'error') {
      return res.status(502).json({
        success: false,
        error: `No hub instance reset its circuit breakers. Affected regions: ${unfinished.join(
          ', '
        )}.`,
        result,
      })
    }

    if (level === 'warning') {
      return res.status(200).json({
        success: false,
        message: `Circuit breakers were not reset in every region. Affected regions: ${unfinished.join(
          ', '
        )}.`,
        result,
      })
    }

    return res.status(200).json({
      success: true,
      message: isEnvironmentReset
        ? 'Circuit breakers reset for the selected environment.'
        : 'All circuit breakers reset.',
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

// 'checkAdmin' stays alongside the capability for now, so removing the
// isAdmin axis later is a pure subtraction rather than a re-gating.
export default withMiddleware(
  { capability: { page: 'adminoperations', capability: 'canResetHubCircuitBreakers' } },
  'checkAdmin'
)(handler)
