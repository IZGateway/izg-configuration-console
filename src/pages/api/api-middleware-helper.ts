import { label, Middleware } from 'next-api-middleware'
import { authOptions } from './auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import { decode } from 'next-auth/jwt'
import logger from '../../../logger'
import hasAccessToDestId from '../../lib/accesshelper'

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
const logRequest: Middleware = async (req, res, next) => {
  const sessionToken =
    req.cookies['next-auth.session-token'] ||
    req.cookies['__Secure-next-auth.session-token']
  const session = await decode({
    token: sessionToken,
    secret: process.env.NEXTAUTH_SECRET,
  })
  logger.debug('Api request ' + req.url, {
    req,
    res,
    user: session.email || null,
  })
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

const withMiddleware = label(
  {
    logRequest,
    captureErrors,
    checkAccessToDestId,
    checkAccessToDestIdSlug,
  },
  ['captureErrors'] //default functions
)

export default withMiddleware
