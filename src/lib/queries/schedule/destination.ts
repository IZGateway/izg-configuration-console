import { prismacontext } from '../../prismacontext'

const scheduleChangeLog = async (scheduledData) => {
  await prismacontext.prisma.destinations_changelog.create({
    data: scheduledData,
  })
}

export default scheduleChangeLog
