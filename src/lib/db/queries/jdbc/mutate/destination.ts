import { prismacontext } from '../../../../prismacontext'
import { Destination } from '../../../../type/Destination'

const updateDestination = async (destination: Destination) => {
  await prismacontext.prisma.destinations.update({
    where: {
      dest_id_dest_type: {
        dest_id: destination.destId,
        dest_type: destination.destinationType.typeId,
      },
    },
    data: {
      username: destination.username,
      password: destination.password,
      facility_id: destination.facilityId,
      MSH3: destination.MSH3,
      MSH4: destination.MSH4,
      MSH5: destination.MSH5,
      MSH6: destination.MSH6,
      MSH22: destination.MSH22,
      RXA11: destination.RXA11,
    },
  })
}

// const updateDestination = async (
//   destId: string,
//   destType: number,
//   updatedData
// ) => {
//   const submittedDestPassword = await prismacontext.prisma
//     .$queryRaw`SELECT password FROM destination_change_request where dest_id=${destId} and dest_type=${destType}`
//   await prismacontext.prisma.destinations.update({
//     where: { dest_id_dest_type: { dest_id: destId, dest_type: destType } },
//     data: {
//       username: updatedData.username,
//       password: submittedDestPassword[0].password,
//       facility_id: updatedData.facility_id,
//       MSH3: updatedData.MSH3,
//       MSH4: updatedData.MSH4,
//       MSH5: updatedData.MSH5,
//       MSH6: updatedData.MSH6,
//       MSH22: updatedData.MSH22,
//       RXA11: updatedData.RXA11,
//     },
//   })
// }

// const auditDestination = async (
//   user: string,
//   oldValues: object,
//   updatedData: object,
//   isPasswordDifferent: object
// ) =>
//   await prismacontext.prisma.audit_history.create({
//     data: {
//       tableName: 'destinations',
//       dest_id: oldValues.dest_id,
//       dest_type: oldValues.destination_type.type_id,
//       userName: user,
//       changeType: 'Update',
//       oldValues: oldValues,
//       newValues: { ...updatedData, ...isPasswordDifferent },
//       createdAt: new Date(),
//     },
//   })

// const updatedAuditedDestination = async (
//   changeRequest: DestinationChangeRequest,
//   user: string
// ) => {
//   await prismacontext.prisma.$transaction(async () => {
//     await updateDestination(destId, destType, updatedData)
//     await auditDestination(user, oldValues, updatedData, isPasswordDifferent)
//   })
// }
export default updateDestination
