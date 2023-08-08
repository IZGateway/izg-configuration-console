import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import hasAccessToDestId from '../../../lib/accesshelper'
import destination from '../../../lib/queries/update/destination'

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const destId = req.query.id.toString()
  const session = await getServerSession(req, res, authOptions)

  if (hasAccessToDestId(destId, session)) {
    if (req.method === 'POST') {
      try {
        const body = req.body
        const result = await destination(destId, body)
        res.status(200).json(result)
      } catch (error) {
        throw new Error(`Failed to update data`)
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' })
    }
  } else {
    res.status(401)
  }
}
