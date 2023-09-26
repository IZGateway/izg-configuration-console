import { prismacontext } from '../../prismacontext'

const createDestinationChangeRequest = async (changeRequestData: any) => {
  await prismacontext.prisma.destination_change_request.create({
    data: changeRequestData,
  })
}

export default createDestinationChangeRequest
