import { Middleware } from 'next-api-middleware'
import logger from '../../../logger'
import hasAccessToDestId from '../../lib/accesshelper'
import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import { asyncRequestContext } from '../../lib/Context'
import { buildRequestContext } from '../../lib/requestContext'

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

// log the api requests and response code
const logApiRequest: Middleware = async (req, res, next) => {
  const context = asyncRequestContext.getStore()
  const user = context?.user || null
  const sub = context?.sub || null
  if (LOG_LEVEL.toLocaleLowerCase() === 'debug') {
    logger.warn(
      'WARNING: LOG_LEVEL is set to DEBUG, this will log sensitive information for every API request'
    )
    logger.info('API Request ' + req.url, {
      req,
      res,
      user,
      sub,
      'x-forwarded-for': req.headers['x-forwarded-for'] || null,
      'user-agent': req.headers['user-agent'] || null,
    })
  } else {
    logger.info('API Request ' + req.url, {
      user,
      sub,
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

// check the caller is an operations/admin user (Okta OPERATIONS_GROUP).
// Guards destructive admin-only operations server-side; the nav/AdminGuard only
// gate the UI.
const checkAdmin: Middleware = async (req, res, next) => {
  const context = asyncRequestContext.getStore()
  const user = context?.user || 'unknown'
  const sub = context?.sub || null
  const isAdmin = context?.session?.user?.isAdmin
  if (isAdmin) {
    await next()
  } else {
    logger.warn('Forbidden: non-admin attempted an admin-only operation', {
      url: req.url,
      method: req.method,
      user,
      sub,
    })
    res.status(403).send('forbidden')
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
    checkAdmin,
  }
  const stack = names.map((name) => middlewareMap[name])

  return (handler: NextApiHandler) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      // Setup the per-request audit context (shared with getServerSideProps reads).
      const context = await buildRequestContext(req, res)
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
