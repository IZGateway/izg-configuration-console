import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import hasAccessToDestId from '../../../lib/accesshelper'
import destination from '../../../lib/queries/update/destination'
import desttypehelper from '../../../lib/desttypehelper'
import destinationType from '../../../lib/queries/fetch/destinationtype'

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const destId = req.query.id.toString()
  const session = await getServerSession(req, res, authOptions)
  const destType = desttypehelper.destTypeFormattedToSyncWithDB(
    req.query.destType.toString()
  )
  if (hasAccessToDestId(destId, session)) {
    const destination_type = await destinationType(destType)
    if (req.method === 'POST') {
      try {
        const body = req.body
        const result = await destination(destId, destination_type.type_id, body)
        res.status(200).json(result)
      } catch (error) {
        console.log(error)
        throw new Error(`Failed to update data`)
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' })
    }
  } else {
    res.status(401)
  }
}
