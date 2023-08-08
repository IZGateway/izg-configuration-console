import { prismacontext } from '../../prismacontext'

const updateDestination = async (destId: string, updatedData) => {
  let updatedDestination = updatedData
  if (updatedDestination.hasOwnProperty('newPassword')) {
    const { newPassword, confirmPassword, ...submittingValue } = updatedData
    updatedDestination = {
      ...submittingValue,
      password: updatedData.newPassword,
    }
  }

  await prismacontext.prisma.destinations.update({
    where: { dest_id: destId },
    data: updatedDestination,
  })
}

const auditDestination = async (
  user: string,
  oldValues: object,
  newValues: object,
  tableName: string
) =>
  await prismacontext.prisma.audit_history.create({
    data: {
      tableName: tableName,
      userName: user,
      changeType: 'Update',
      oldValues: oldValues,
      newValues: newValues,
      createdAt: new Date(),
    },
  })

const updatedAuditedDestination = async (
  destId: string,
  updatedData: object,
  user: string,
  oldValues: object,
  newValues: object,
  tableName: string
) => {
  await prismacontext.prisma.$transaction(async () => {
    await updateDestination(destId, updatedData)
    await auditDestination(user, oldValues, newValues, tableName)
  })
}
export default updatedAuditedDestination
