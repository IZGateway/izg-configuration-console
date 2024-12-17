import logger from '../../../../../../logger'
import { prismacontext } from '../../../../prismacontext'
import { DestinationType } from '../../../../type/DestinationType'

const fetchDestinationType = async (
  destType: string
): Promise<DestinationType> => {
  const result = await prismacontext.prisma.destination_type.findFirst({
    where: {
      type: {
        contains: destType,
      },
    },
  })
  if (!result) {
    logger.error(`Destination Type not found: ${destType}`)
    return null
  }
  return {
    typeId: result.type_id,
    type: result.type,
  }
}

const fetchDestinationTypeByType = async (destType: string) => {
  const type = await fetchDestinationType(destType)
  return type
}
export default fetchDestinationTypeByType
