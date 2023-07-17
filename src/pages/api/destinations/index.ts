import type { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import { prismacontext } from '../../../lib/prismacontext'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const token = await getToken({ req })
  const session = await getServerSession(req, res, authOptions)

  if (token) {
    if (req.method === 'GET') {
      const destinations = await prismacontext.prisma.destinations.findMany({
        where: !session.isAdmin
          ? {
              dest_id: {
                in: session.jurisdictions,
              },
            }
          : {},

        select: {
          dest_id: true,
          dest_uri: true,
          destination_type: {
            select: {
              type: true,
            },
          },
          endpointstatus: {
            select: {
              detail: true,
              diagnostics: true,
              retry_strategy: true,
            },
          },
        },
      })
      res.json(destinations)
    } else {
      throw new Error(
        `The HTTP ${req.method} method is not supported at this route.`
      )
    }
  } else {
    res.status(401)
  }
}
