import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import hasAccessToDestId from '../../../lib/accesshelper'
import * as fs from 'fs'
import path from 'path'
import https from 'https'
import axios from 'axios'
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
export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const IZG_STATUS_ENDPOINT_URL =
    process.env.IZG_STATUS_ENDPOINT_URL || 'unknown'
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

  const destId = req.query.id.toString()
  const session = await getServerSession(req, res, authOptions)
  const fetchEndpointStatus = async (destId, count) => {
    const responseData = await axios
      .get(`${IZG_STATUS_ENDPOINT_URL}/${destId}`, {
        httpsAgent: new https.Agent(httpsAgentOptions),
        timeout: 30000,
        params: { count: count },
      })
      .then((response) => {
        return response.data
      })
      .catch((error) => {
        console.log(error)
      })
    return responseData
  }

  if (hasAccessToDestId(destId, session)) {
    if (req.method === 'GET') {
      const result = await fetchEndpointStatus(destId, historyCount)
      res.json(result)
    } else {
      throw new Error(
        `The HTTP ${req.method} method is not supported at this route.`
      )
    }
  } else {
    res.status(401)
  }
}
