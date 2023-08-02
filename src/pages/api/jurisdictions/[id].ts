import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import hasAccessToDestId from '../../../lib/accesshelper'
import jurisdiction from '../../../lib/queries/fetch/jurisdiction'

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const destId = req.query.id.toString()
  const session = await getServerSession(req, res, authOptions)

  if (hasAccessToDestId(destId, session)) {
    if (req.method === 'GET') {
      const result = await jurisdiction(destId)
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
