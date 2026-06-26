import { Middleware } from 'next-api-middleware'
import { authOptions } from './auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import logger from '../../../logger'
import hasAccessToDestId from '../../lib/accesshelper'
import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import { asyncRequestContext, Context } from '../../lib/Context'

const LOG_LEVEL = process.env.LOG_LEVEL || 'info'

// Catch any errors
const captureErrors: Middleware = async (req, res, next) => {
  try {
    await next()
  } catch (error) {
    logger.error('Unhandled error in request', {
      url: req.url,
      method: req.method,
      query: req.query,
      statusCode: 500,
      errorMessage: error.message,
      errorType: error.name,
      stack: error.stack,
    })
    res.status(500)
    res.json({ error: error })
  }
}

// log the api requests and response code. User identity is attached
// automatically by the logger's request-context format (IGDD-2223), so it is
// no longer passed explicitly here.
const logApiRequest: Middleware = async (req, res, next) => {
  if (LOG_LEVEL.toLocaleLowerCase() === 'debug') {
    logger.warn(
      'WARNING: LOG_LEVEL is set to DEBUG, this will log sensitive information for every API request'
    )
    logger.info('API Request ' + req.url, {
      req,
      res,
      'x-forwarded-for': req.headers['x-forwarded-for'] || null,
      'user-agent': req.headers['user-agent'] || null,
    })
  } else {
    logger.info('API Request ' + req.url, {
      'x-forwarded-for': req.headers['x-forwarded-for'] || null,
      'user-agent': req.headers['user-agent'] || null,
    })
  }
  await next()
}

// check access to destination
const checkAccessToDestId: Middleware = async (req, res, next) => {
  const destId = req.query.id.toString()
  const context = asyncRequestContext.getStore()
  const user = context?.user || 'unknown'
  const sub = context?.sub || null
  const hasAccess = hasAccessToDestId(destId, context?.session)
  if (hasAccess) {
    logger.debug('Api request ' + req.url, {
      req,
      res,
      user,
      sub,
    })
    await next()
  } else {
    res.status(401).send('unauthorized')
    logger.debug('Api request ' + req.url, {
      req,
      res,
      user,
      sub,
    })
  }
}
const checkAccessToDestIdSlug: Middleware = async (req, res, next) => {
  const { slug } = req.query
  const destId = slug[1]
  const context = asyncRequestContext.getStore()
  const user = context?.user || 'unknown'
  const sub = context?.sub || null
  const hasAccess = hasAccessToDestId(destId, context?.session)
  if (hasAccess) {
    logger.debug('Api request ' + req.url, {
      req,
      res,
      user,
      sub,
    })
    await next()
  } else {
    res.status(401).send('unauthorized')
    logger.debug('Api request ' + req.url, {
      req,
      res,
      user,
      sub,
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
      // Setup DbRequestContext for this request
      const session = await getServerSession(req, res, authOptions)
      const user = session?.user?.name || session?.user?.email || 'unknown'
      const ipAddress =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        req.socket?.remoteAddress ||
        'unknown'
      const jwtToken = await getToken({ req })
      const sub = (jwtToken?.sub as string) || undefined
      const context: Context = {
        user,
        ipAddress,
        sub,
        session,
        userId: sub,
        email: session?.user?.email || undefined,
        sessionId: jwtToken?.sessionId || undefined,
        authTime: jwtToken?.authTime || undefined,
      }
      await asyncRequestContext.run(context, async () => {
        const dispatch = async (i: number): Promise<void> => {
          if (i < stack.length) {
            await stack[i](req, res, () => dispatch(i + 1))
          } else {
            await handler(req, res)
          }
        }
        await dispatch(0)
      })
    }
  }
}

export default withMiddleware
