import _ from 'lodash'
import { prismacontext } from '../../prismacontext'

const upsertDestinationChangeRequest = async (changeRequestData: any) => {
  if (_.isEmpty(changeRequestData.password)) {
    const currentDestPassword = await prismacontext.prisma
      .$queryRaw`SELECT password FROM destinations where dest_id=${changeRequestData.dest_id} and dest_type=${changeRequestData.dest_type}`
    if (currentDestPassword.length > 0) {
      changeRequestData.password = currentDestPassword[0].password
      return await prismacontext.prisma.destination_change_request.upsert({
        where: {
          id: changeRequestData.id || 0,
          dest_type: changeRequestData.dest_type,
          dest_id: changeRequestData.dest_id,
        },
        create: {
          ...changeRequestData,
        },
        update: {
          ...changeRequestData,
        },
      })
    }
  } else {
    return await prismacontext.prisma.destination_change_request.upsert({
      where: {
        id: changeRequestData.id || 0,
        dest_type: changeRequestData.dest_type,
        dest_id: changeRequestData.dest_id,
      },
      create: {
        ...changeRequestData,
      },
      update: {
        ...changeRequestData,
      },
    })
  }
}

const deleteDestinationChangeRequest = async (id: any) => {
  return await prismacontext.prisma.destination_change_request.delete({
    where: {
      id: id,
    },
  })
}

export { upsertDestinationChangeRequest, deleteDestinationChangeRequest }
