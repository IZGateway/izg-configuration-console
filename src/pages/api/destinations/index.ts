import type { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import * as fs from 'fs'
import path from 'path'
import https from 'https'
import axios from 'axios'
import logger from '../../../../logger'
import withMiddleware from '../api-middleware-helper'
/**
 * @swagger
 * /api/destinations:
 *   get:
 *     summary: Get all destinations information.
 *     responses:
 *       200:
 *         description: OK.
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
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

  const fetchEndpointStatus = async (isAdmin, jurisdictions) => {
    const endpoint = isAdmin
      ? IZG_STATUS_ENDPOINT_URL
      : IZG_STATUS_ENDPOINT_URL + '?include=' + `${jurisdictions?.join(',')}`
    const responseData = await axios
      .get(endpoint, {
        httpsAgent: new https.Agent(httpsAgentOptions),
        timeout: 30000,
      })
      .then((response) => {
        return response.data
      })
      .catch((error) => {
        logger.error('Something went wrong ' + endpoint, { err: error })
      })
    return responseData
  }
  const token = await getToken({ req })
  const session = await getServerSession(req, res, authOptions)

  if (token) {
    if (req.method === 'GET') {
      const result = await fetchEndpointStatus(
        session.isAdmin,
        session.jurisdictions
      )

      //   const result = await destinations(session.isAdmin, session.jurisdictions)
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
export default withMiddleware()(handler)
