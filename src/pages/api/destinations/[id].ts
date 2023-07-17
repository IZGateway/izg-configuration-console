import type { NextApiRequest, NextApiResponse } from 'next'
import { prismacontext } from '../../../lib/prismacontext'

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const destId = req.query.id.toString()

  if (req.method === 'GET') {
    const post = await prismacontext.prisma.destinations.findUnique({
      include: {
        destination_type: true,
        endpointstatus: true,
      },
      where: { dest_id: destId },
    })
    res.json(post)
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}
