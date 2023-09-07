import { prismacontext } from '../../prismacontext'

const destinationChangeLog = async (scheduledData) => {
  await prismacontext.prisma.destinations_changelog.create({
    data: scheduledData,
  })
}

export default destinationChangeLog
