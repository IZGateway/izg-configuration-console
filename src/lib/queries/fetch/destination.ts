import { prismacontext } from '../../prismacontext'

const destination = async (destId: string) =>
  await prismacontext.prisma.destinations.findUnique({
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

export default destination
