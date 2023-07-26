import { prismacontext } from '../../prismacontext'

const destination = async (destId: string, data) => {
  let updatedDestination = JSON.parse(data)
  if (updatedDestination.hasOwnProperty('newPassword')) {
    const { newPassword, confirmPassword, ...submittingValue } =
      JSON.parse(data)
    updatedDestination = { ...submittingValue, password: data.newPassword }
  }
  await prismacontext.prisma.destinations.update({
    where: { dest_id: destId },
    data: updatedDestination,
  })
}
export default destination
