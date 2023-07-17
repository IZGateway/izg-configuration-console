import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { prismacontext } from '../../../lib/prismacontext'

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const MAX_STATUS_HISTORY_RETURNED =
    parseInt(process.env.IZG_MAX_STATUS_HISTORY_RETURNED) || 20
  const destId = req.query.id.toString()

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
}
