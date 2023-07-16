import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { prismacontext } from '../../../lib/prismacontext'

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const destId = req.query.id.toString()

  const session = await getSession({ req })

  if (req.method === 'GET') {
    if (session) {
      const post = await prismacontext.prisma.destinations.findUnique({
        include: {
          destination_type: true,
          endpointstatus: true,
        },
        where: { dest_id: destId },
      })
      res.json(post)
    } else {
      res.status(401).send({ message: 'Unauthorized' })
    }
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`,
    )
  }
}
