import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import scheduleChangeLog from '../../../../lib/queries/schedule/destination'
import hasAccessToDestId from '../../../lib/accesshelper'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)
  if (hasAccessToDestId(destId, session)) {
    if (req.method === 'POST') {
      const data = JSON.parse(req.body)
      const result = await scheduleChangeLog(data)
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
