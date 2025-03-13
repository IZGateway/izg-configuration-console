/* eslint-disable @typescript-eslint/no-explicit-any */
import { prismacontext } from '../../../../prismacontext'

const isDatabaseConnected = async (): Promise<boolean> => {
  const result = await prismacontext.prisma.$queryRaw<any[]>`SELECT 1`
  return result.length >= 1
}
export default isDatabaseConnected
