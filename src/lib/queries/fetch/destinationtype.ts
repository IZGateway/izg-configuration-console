import { prismacontext } from '../../prismacontext'

const destinationType = async (destType: string) =>
  await prismacontext.prisma.destination_type.findFirst({
    where: {
      type: {
        contains: destType,
      },
    },
  })

export default destinationType
