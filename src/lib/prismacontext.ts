/* eslint-disable @typescript-eslint/ban-ts-comment */
// eslint-disable-next-line camelcase
import { PrismaClient } from '@prisma/client'

const showSql =
  process.env.SHOW_SQL_IN_CONSOLE?.toLocaleLowerCase() === 'true' || false

const prisma = new PrismaClient({
  log: showSql ? ['query', 'info', 'warn', 'error'] : [],
})

export interface Context {
  prisma: PrismaClient
  session: {
    user: {
      name: string
      email: string
      image: string
    }
  }
}

export const prismacontext = {
  prisma,
}
