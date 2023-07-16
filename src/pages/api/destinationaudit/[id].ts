import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { prismacontext } from '../../../lib/prismacontext'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const destId = req.query.id.toString()
  const session = await getSession({ req })

  if (req.method === 'GET') {
    if (session) {
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
      res.status(401).send({ message: 'Unauthorized' })
    }
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}
