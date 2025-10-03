import type { NextApiRequest, NextApiResponse } from 'next'
import * as fs from 'fs'
import path from 'path'
import https from 'https'
import axios from 'axios'
import logger from '../../../../logger'
import withMiddleware from '../api-middleware-helper'
import _ from 'lodash'
import IZGHubStatusHistoryEndpoint from '../../../lib/IZGHubStatusHistoryEndpoint'
/**
 * @swagger
 * /api/statushistory/{id}:
 *   get:
 *     summary: Get status of destination by ID.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the destination.
 *     responses:
 *       200:
 *         description: OK.
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
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
  const historyCount =
    parseInt(process.env.IZG_MAX_STATUS_HISTORY_RETURNED) || 4
  const configuredHubURLs = new IZGHubStatusHistoryEndpoint(
    IZG_STATUS_ENDPOINT_URL
  )

  const { slug } = req.query
  const destId = slug[1]
  const destTypeId = _.toNumber(slug[0])
  const fetchEndpointStatus = async (destId, count) => {
    const configuredEndpoint = configuredHubURLs.getIZGHubURL(destTypeId)
    const endpoint = `${configuredEndpoint}/${destId}`
    const responseData = await axios
      .get(endpoint, {
        httpsAgent: new https.Agent(httpsAgentOptions),
        timeout: 30000,
        params: { count: count },
      })
      .then((response) => {
        return response.data
      })
      .catch((error) => {
        logger.error('Failed to fetch endpoint status', {
          endpoint,
          destinationId: destId,
          destinationType: destTypeId,
          errorMessage: error.message,
          errorType: error.name,
          statusCode: axios.isAxiosError(error)
            ? error.response?.status
            : undefined,
          responseData: axios.isAxiosError(error)
            ? error.response?.data
            : undefined,
          stack: error.stack,
          operation: 'fetchEndpointStatus',
        })
      })
    return responseData
  }

  if (req.method === 'GET') {
    const result = await fetchEndpointStatus(destId, historyCount)
    res.json(result)
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}

export default withMiddleware('checkAccessToDestIdSlug')(handler)
