import type { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import destinations from '../../../lib/queries/fetch/destinations'
/**
 * @swagger
 * /api/destinations:
 *   get:
 *     summary: Get all destinations information.
 *     responses:
 *       200:
 *         description: OK.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const token = await getToken({ req })
  const session = await getServerSession(req, res, authOptions)

  if (token) {
    if (req.method === 'GET') {
      const result = await destinations(session.isAdmin, session.jurisdictions)
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
