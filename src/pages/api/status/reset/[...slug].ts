import type { NextApiRequest, NextApiResponse } from 'next'
import * as fs from 'fs'
import path from 'path'
import https from 'https'
import axios from 'axios'
import logger from '../../../../../logger'
import withMiddleware from '../../api-middleware-helper'
import _ from 'lodash'
import IZGHubStatusHistoryEndpoint from '../../../../lib/IZGHubStatusHistoryEndpoint'
import { asyncRequestContext } from '../../../../lib/Context'

/**
 * @swagger
 * /api/status/reset/{destTypeId}/{destId}:
 *   post:
 *     summary: Reset the circuit breaker for a single destination.
 *     parameters:
 *       - name: destTypeId
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *         description: The ID of the destination type.
 *       - name: destId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the destination.
 *     responses:
 *       200:
 *         description: OK.
 *       404:
 *         description: Destination not found.
 *       502:
 *         description: The Hub could not be reached.
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const context = asyncRequestContext.getStore()
  const allowedRoles = ['IZG Operations', 'Jurisdiction Operations']
  if (!allowedRoles.includes(context?.session?.user?.role)) {
    return res.status(401).send('unauthorized')
  }

  const IZG_STATUS_ENDPOINT_URL = process.env.IZG_STATUS_ENDPOINT_URL || ''
  const IZG_ENDPOINT_CRT_PATH = process.env.IZG_ENDPOINT_CRT_PATH || undefined
  const IZG_ENDPOINT_KEY_PATH = process.env.IZG_ENDPOINT_KEY_PATH || undefined
  const IZG_ENDPOINT_PASSCODE = process.env.IZG_ENDPOINT_PASSCODE || undefined
  const httpsAgentOptions = {
    cert: fs.readFileSync(path.resolve(IZG_ENDPOINT_CRT_PATH), 'utf-8'),
    key: fs.readFileSync(path.resolve(IZG_ENDPOINT_KEY_PATH), 'utf-8'),
    passphrase: IZG_ENDPOINT_PASSCODE,
    rejectUnauthorized: false,
    keepAlive: true,
  }
  const configuredHubURLs = new IZGHubStatusHistoryEndpoint(
    IZG_STATUS_ENDPOINT_URL
  )

  const { slug } = req.query
  const destId = slug[1]
  const destTypeId = _.toNumber(slug[0])

  const resetCircuitBreaker = async (destTypeId: number, destId: string) => {
    const configuredEndpoint = configuredHubURLs.getIZGHubURL(destTypeId)
    const resetUrl =
      configuredEndpoint.substring(
        0,
        configuredEndpoint.indexOf('/rest/') + 6
      ) + `reset/${destId}`
    return axios.post(
      resetUrl,
      {},
      {
        httpsAgent: new https.Agent(httpsAgentOptions),
        timeout: 30000,
      }
    )
  }

  if (req.method === 'POST') {
    try {
      const response = await resetCircuitBreaker(destTypeId, destId)
      logger.info('Circuit breaker reset', {
        destinationId: destId,
        destinationType: destTypeId,
      })
      // Remove statusBy field to prevent private IP/DNS being delivered to
      // client, matching fetchEndpointStatus.ts's redaction on initial load.
      delete response.data?.statusBy
      res.status(response.status).json(response.data)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        logger.error('Hub rejected circuit breaker reset request', {
          destinationId: destId,
          destinationType: destTypeId,
          statusCode: error.response.status,
          responseData: error.response.data,
          operation: 'resetCircuitBreaker',
        })
        res.status(error.response.status).json(error.response.data)
      } else {
        logger.error('Failed to reach the Hub to reset circuit breaker', {
          destinationId: destId,
          destinationType: destTypeId,
          errorMessage: error.message,
          errorType: error.name,
          stack: error.stack,
          operation: 'resetCircuitBreaker',
        })
        res.status(502).json({ error: 'Failed to reach the Hub' })
      }
    }
  } else {
    res.setHeader('Allow', ['POST'])
    return res
      .status(405)
      .json({ error: `The HTTP ${req.method} method is not supported at this route.` })
  }
}

export default withMiddleware('checkAccessToDestIdSlug')(handler)
