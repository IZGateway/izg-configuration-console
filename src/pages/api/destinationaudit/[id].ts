import type { NextApiRequest, NextApiResponse } from 'next'
import { prismacontext } from '../../../lib/prismacontext'
import { authOptions } from '../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import hasAccessToDestId from '../../../lib/accesshelper'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const destId = req.query.id.toString()
  const session = await getServerSession(req, res, authOptions)

  if (hasAccessToDestId(destId, session)) {
    if (req.method === 'GET') {
      const auditHistory = await prismacontext.prisma.audit_history.findMany({
        where: {
          tableName: 'destinations',
          // userName: _args.user,
          oldValues: {
            path: '$.dest_id',
            equals: destId,
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      res.json(auditHistory)
    } else {
      throw new Error(
        `The HTTP ${req.method} method is not supported at this route.`
      )
    }
  } else {
    res.status(401)
  }
}
