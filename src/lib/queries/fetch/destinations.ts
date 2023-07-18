import { prismacontext } from '../../prismacontext'

const destinations = async (isAdmin: boolean, jurisdictions: any) =>
  await prismacontext.prisma.destinations.findMany({
    where: !isAdmin
      ? {
          dest_id: {
            in: jurisdictions,
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

export default destinations
