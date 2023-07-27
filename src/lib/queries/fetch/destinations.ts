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
      username: true,
      facility_id: true,
      MSH3: true,
      MSH4: true,
      MSH5: true,
      MSH6: true,
      MSH22: true,
      RXA11: true,
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
          status: true,
          ran_at: true,
        },
        orderBy: {
          ran_at: 'desc',
        },
        take: 1,
      },
    },
  })

export default destinations
