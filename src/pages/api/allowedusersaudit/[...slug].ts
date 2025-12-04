import type { NextApiRequest, NextApiResponse } from 'next'
import _ from 'lodash'
import withMiddleware from '../api-middleware-helper'
import DbClientFactory from '../../../lib/db/DbClientFactory'

/**
 * @swagger
 * /api/allowedusersaudit/{environment}/{destinationId}/{principal}:
 *   get:
 *     summary: Get audit history for an allowed user
 *     parameters:
 *       - name: environment
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *         description: The environment ID
 *       - name: destinationId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The destination ID
 *       - name: principal
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The principal/user identifier
 *     responses:
 *       200:
 *         description: OK. Returns audit history for the allowed user.
 *       400:
 *         description: Bad request - missing required parameters
 *       500:
 *         description: Internal server error
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { slug } = req.query

  if (req.method === 'GET') {
    // Extract parameters from slug array
    if (!slug || slug.length < 3) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Environment, destinationId, and principal are required',
      })
    }

    const environment = _.toNumber(slug[0])
    const destinationId = slug[1]
    const principal = slug[2]

    if (isNaN(environment)) {
      return res.status(400).json({
        error: 'Invalid environment parameter',
        message: 'Environment must be a valid number',
      })
    }

    const dbClient = await DbClientFactory.getDbClient()
    const result = await dbClient.fetchAllowedUserAuditHistory(
      principal,
      environment,
      destinationId
    )

    // Note: AllowedUser doesn't have password fields, so no need to mask
    // But keeping this pattern in case we add sensitive fields in the future
    for (const record of result) {
      if (record.oldValues?.['password']) {
        record.oldValues['password'] = '.........'
      }
      if (record.newValues?.['password']) {
        record.newValues['password'] = '.........'
      }
    }

    res.json(result)
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}

export default withMiddleware('captureErrors')(handler)
