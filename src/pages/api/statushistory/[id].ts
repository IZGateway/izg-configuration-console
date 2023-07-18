import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import hasAccessToDestId from '../../../lib/accesshelper'
import endpointstatus from '../../../lib/queries/fetch/endpointstatus'

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const MAX_STATUS_HISTORY_RETURNED =
    parseInt(process.env.IZG_MAX_STATUS_HISTORY_RETURNED) || 20

  const destId = req.query.id.toString()
  const session = await getServerSession(req, res, authOptions)

  if (hasAccessToDestId(destId, session)) {
    if (req.method === 'GET') {
      const result = await endpointstatus(destId, MAX_STATUS_HISTORY_RETURNED)
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
