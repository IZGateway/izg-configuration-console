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
  oldValues: object,
  updatedData: object
) =>
  await prismacontext.prisma.audit_history.create({
    data: {
      tableName: 'destinations',
      userName: user,
      changeType: 'Update',
      oldValues: JSON.stringify(oldValues),
      newValues: JSON.stringify(updatedData),
      createdAt: new Date(),
    },
  })

const updatedAuditedDestination = async (
  destId: string,
  destType: number,
  updatedData: object,
  user: string,
  oldValues: object
) => {
  await prismacontext.prisma.$transaction(async () => {
    await updateDestination(destId, destType, updatedData)
    await auditDestination(user, oldValues, updatedData)
  })
}
export default updatedAuditedDestination
