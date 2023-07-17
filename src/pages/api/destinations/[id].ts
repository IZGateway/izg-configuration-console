import type { NextApiRequest, NextApiResponse } from 'next'
import { prismacontext } from '../../../lib/prismacontext'
import { authOptions } from '../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import hasAccessToDestId from '../../../lib/accesshelper'

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const destId = req.query.id.toString()

  const session = await getServerSession(req, res, authOptions)

  if (hasAccessToDestId(destId, session)) {
    if (req.method === 'GET') {
      const post = await prismacontext.prisma.destinations.findUnique({
        where: { dest_id: destId },
        select: {
          dest_id: true,
          dest_uri: true,
          dest_version: true,
          username: true,
          MSH6: true,
          MSH22: true,
          MSH3: true,
          MSH4: true,
          MSH5: true,
          RXA11: true,
          facility_id: true,
          pass_expiry: true,
          signed_mou: true,
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
