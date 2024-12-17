import logger from '../../../../../../logger'
import { prismacontext } from '../../../../prismacontext'
import { Jurisdiction } from '../../../../type/Jurisdiction'

const fetchJurisdiction = async (destId: string): Promise<Jurisdiction> => {
  const result = await prismacontext.prisma.jurisdiction.findFirst({
    where: { dest_prefix: destId },
    select: {
      jurisdiction_id: true,
      name: true,
      description: true,
    },
  })
  if (!result) {
    logger.debug(`Jurisdiction not found: ${destId}`)
    return null
  }
  return {
    jurisdiction_id: result.jurisdiction_id,
    name: result.name,
    description: result.description,
  }
}

const fetchJurisdictionByDestId = async (destId: string) => {
  const juridiction = await fetchJurisdiction(destId)
  return juridiction
}
export default fetchJurisdictionByDestId
