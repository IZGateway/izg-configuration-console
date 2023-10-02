import { prismacontext } from '../../prismacontext'

const destination = async (destId: string, destType: number) =>
  await prismacontext.prisma.destinations.findUnique({
    where: { dest_id_dest_type: { dest_id: destId, dest_type: destType } },
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
      destination_type: {
        select: {
          type: true,
          type_id: true,
        },
      },
      jurisdiction: {
        select: {
          name: true,
          description: true,
        },
      },
    },
  })

export default destination
