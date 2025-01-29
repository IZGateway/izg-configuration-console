import { PrismaClient } from '@prisma/client'
import logger from '../../logger'

const showSql =
  process.env.SHOW_SQL_IN_CONSOLE?.toLocaleLowerCase() === 'true' || false

const prisma = new PrismaClient({
  log: showSql
    ? [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'stdout',
          level: 'error',
        },
        {
          emit: 'stdout',
          level: 'info',
        },
        {
          emit: 'stdout',
          level: 'warn',
        },
      ]
    : [],
})

prisma.$on('query', (e) => {
  logger.debug('Query: ' + e.query)
  logger.debug('Params: ' + e.params)
  logger.debug('Duration: ' + e.duration + 'ms')
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
