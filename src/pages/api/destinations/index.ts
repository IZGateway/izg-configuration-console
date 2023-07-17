import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { prismacontext } from '../../../lib/prismacontext'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const destinations = await prismacontext.prisma.destinations.findMany({
      include: {
        destination_type: true,
        endpointstatus: true,
      },
    })
    res.json(destinations)
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}
