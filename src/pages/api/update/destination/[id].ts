import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import hasAccessToDestId from '../../../../lib/accesshelper'
import updatedAuditedDestination from '../../../../lib/queries/update/destination'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const destId = req.query.id.toString()

  const session = await getServerSession(req, res, authOptions)

  if (hasAccessToDestId(destId, session)) {
    if (req.method === 'POST') {
      const data = JSON.parse(req.body)
      const result = await updatedAuditedDestination(
        destId,
        data.updatedData,
        data.user,
        data.oldValues,
        data.newValues,
        data.tableName
      )
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
