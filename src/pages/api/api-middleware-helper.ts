import { Middleware } from 'next-api-middleware'
import { authOptions } from './auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import logger from '../../../logger'
import hasAccessToDestId from '../../lib/accesshelper'
import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'

const LOG_LEVEL = process.env.LOG_LEVEL || 'info'

// Catch any errors
const captureErrors: Middleware = async (req, res, next) => {
  try {
    await next()
  } catch (err) {
    logger.error('Error with ' + req.url, { err: err })
    res.status(500)
    res.json({ error: err })
  }
}

// log the api requests and response code
const logApiRequest: Middleware = async (req, res, next) => {
  const session = await getServerSession(req, res, authOptions)
  if (LOG_LEVEL.toLocaleLowerCase() === 'debug') {
    logger.warn(
      'WARNING: LOG_LEVEL is set to DEBUG, this will log sensitive information for every API request'
    )
    logger.info('API Request ' + req.url, {
      req,
      res,
      user: session?.user?.email || null,
      sub: session?.user?.sub || null,
      'x-forwarded-for': req.headers['x-forwarded-for'] || null,
      'user-agent': req.headers['user-agent'] || null,
    })
  } else {
    logger.info('API Request ' + req.url, {
      user: session?.user?.email || null,
      sub: session?.user?.sub || null,
      'x-forwarded-for': req.headers['x-forwarded-for'] || null,
      'user-agent': req.headers['user-agent'] || null,
    })
  }
  await next()
}

// check access to destination
const checkAccessToDestId: Middleware = async (req, res, next) => {
  const destId = req.query.id.toString()
  const session = await getServerSession(req, res, authOptions)
  const hasAccess = hasAccessToDestId(destId, session)
  if (hasAccess) {
    logger.debug('Api request ' + req.url, {
      req,
      res,
      user: session.user.email,
    })
    await next()
  } else {
    res.status(401).send('unauthorized')
    logger.debug('Api request ' + req.url, {
      req,
      res,
      user: session.user.email,
    })
  }
}
const checkAccessToDestIdSlug: Middleware = async (req, res, next) => {
  const { slug } = req.query
  const destId = slug[1]
  const session = await getServerSession(req, res, authOptions)
  const hasAccess = hasAccessToDestId(destId, session)
  if (hasAccess) {
    logger.debug('Api request ' + req.url, {
      req,
      res,
      user: session.user.email,
    })
    await next()
  } else {
    res.status(401).send('unauthorized')
    logger.debug('Api request ' + req.url, {
      req,
      res,
      user: session.user.email,
    })
  }
}

const withMiddleware = (...middlewareNames: string[]) => {
  const defaultMiddleware = ['logApiRequest']
  const names = Array.from(new Set([...defaultMiddleware, ...middlewareNames]))
  const middlewareMap = {
    logApiRequest,
    captureErrors,
    checkAccessToDestId,
    checkAccessToDestIdSlug,
  }
  const stack = names.map((name) => middlewareMap[name])

  return (handler: NextApiHandler) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const dispatch = async (i: number): Promise<void> => {
        if (i < stack.length) {
          await stack[i](req, res, () => dispatch(i + 1))
        } else {
          await handler(req, res)
        }
      }
      await dispatch(0)
    }
  }
}

export default withMiddleware
