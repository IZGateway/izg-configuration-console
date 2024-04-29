import { prismacontext } from '../../prismacontext'

const updateDestination = async (
  destId: string,
  destType: number,
  updatedData
) => {
  const submittedDestPassword = await prismacontext.prisma
    .$queryRaw`SELECT password FROM destination_change_request where dest_id=${destId} and dest_type=${destType}`
  await prismacontext.prisma.destinations.update({
    where: { dest_id_dest_type: { dest_id: destId, dest_type: destType } },
    data: {
      username: updatedData.username,
      password: submittedDestPassword[0].password,
      MSH3: updatedData.MSH3,
      MSH4: updatedData.MSH4,
      MSH5: updatedData.MSH5,
      MSH6: updatedData.MSH6,
      MSH22: updatedData.MSH22,
      RXA11: updatedData.RXA11,
    },
  })
}

const auditDestination = async (
  user: string,
  oldValues: any,
  updatedData: object,
  isPasswordDifferent: object
) =>
  await prismacontext.prisma.audit_history.create({
    data: {
      tableName: 'destinations',
      dest_id: oldValues.dest_id,
      dest_type: oldValues.destination_type.type_id,
      userName: user,
      changeType: 'Update',
      oldValues: oldValues,
      newValues: { ...updatedData, ...isPasswordDifferent },
      createdAt: new Date(),
    },
  })

const updatedAuditedDestination = async (
  destId: string,
  destType: number,
  updatedData: object,
  user: string,
  oldValues: object,
  isPasswordDifferent: object
) => {
  await prismacontext.prisma.$transaction(async () => {
    await updateDestination(destId, destType, updatedData)
    await auditDestination(user, oldValues, updatedData, isPasswordDifferent)
  })
}
export default updatedAuditedDestination
