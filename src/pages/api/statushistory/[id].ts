import type { NextApiRequest, NextApiResponse } from 'next'
import { prismacontext } from '../../../lib/prismacontext'
import { authOptions } from '../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import hasAccessToDestId from '../../../lib/accesshelper'

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
      const post = await prismacontext.prisma.endpointstatus.findMany({
        take: MAX_STATUS_HISTORY_RETURNED,
        where: { dest_id: destId },
        orderBy: { ran_at: 'desc' },
      })
      res.json(post)
    } else {
      throw new Error(
        `The HTTP ${req.method} method is not supported at this route.`
      )
    }
  } else {
    res.status(401)
  }
}
