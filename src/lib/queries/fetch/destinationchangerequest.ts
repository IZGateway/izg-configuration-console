import { prismacontext } from '../../prismacontext'

const destinationChangeRequest = async (destId: string, dest_type: number) =>
  await prismacontext.prisma.destination_change_request.findFirst({
    where: { dest_id: destId, dest_type: dest_type },
    select: {
      id: true,
      dest_id: true,
      dest_uri: true,
      dest_type: true,
      jira_id: true,
      MSH22: true,
      MSH3: true,
      MSH4: true,
      MSH5: true,
      MSH6: true,
      requestedAt: true,
      requestedBy: true,
      RXA11: true,
      scheduledAt: true,
      username: true,
      facility_id: true,
      destinations: {
        select: {
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
      },
    },
  })

export default destinationChangeRequest
