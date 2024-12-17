import { prismacontext } from '../../../../prismacontext'

const passwordComparison = async (
  destId: string,
  dest_type: number
): Promise<boolean> => {
  const result = await prismacontext.prisma
    .$queryRaw`SELECT case WHEN d.password = dc.password THEN 0 else 1 END AS is_password_different
FROM destinations d JOIN destination_change_request dc ON d.dest_id=dc.dest_id AND d.dest_type = dc.dest_type
WHERE dc.dest_id = ${destId}
AND dc.dest_type = ${dest_type}`
  return result[0]
}
export default passwordComparison
