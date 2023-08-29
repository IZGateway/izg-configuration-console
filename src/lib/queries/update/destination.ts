import { prismacontext } from '../../prismacontext'

const destination = async (destId: string, destType: number, data) => {
  let updatedDestination = JSON.parse(data)
  if (updatedDestination.hasOwnProperty('newPassword')) {
    const { newPassword, confirmPassword, ...submittingValue } =
      JSON.parse(data)
    updatedDestination = { ...submittingValue, password: data.newPassword }
  }
  await prismacontext.prisma.destinations.update({
    where: { dest_id_dest_type: { dest_id: destId, dest_type: destType } },
    data: updatedDestination,
  })
}
export default destination
