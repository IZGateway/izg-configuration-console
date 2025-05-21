import { label, Middleware } from 'next-api-middleware'
import { authOptions } from './auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import { decode } from 'next-auth/jwt'
import logger, { asyncLocalStorage } from '../../../logger'
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
  let username = 'Config Console Application'
  let ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'ConfigConsoleSystemIP'

  try {
    const session = await decode({
      token: sessionToken,
      secret: process.env.NEXTAUTH_SECRET,
    })
    if (session?.email) {
      username = session.email
    }
  } catch (err) {
    logger.error('Error decoding session token', { err: err })
  }

  return asyncLocalStorage.run({ username, ipAddress: ipAddress.toString() }, async () => {
    logger.debug('API request: ' + req.url)
    await next()
  })
}

// check access to destination
const checkAccessToDestId: Middleware = async (req, res, next) => {
  const destId = req.query.id.toString()
  const session = await getServerSession(req, res, authOptions)
  const hasAccess = hasAccessToDestId(destId, session)
  const username = session?.user?.email || 'Config Console Application'
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'ConfigConsoleSystemIP'

  return asyncLocalStorage.run({ username, ipAddress: ipAddress.toString() }, async () => {
    if (hasAccess) {
      logger.debug('Access granted to: ' + req.url)
      await next()
    } else {
      res.status(401).send('unauthorized')
      logger.debug('Access denied to: ' + req.url)
    }
  })
}

const checkAccessToDestIdSlug: Middleware = async (req, res, next) => {
  const { slug } = req.query
  const destId = slug[1]
  const session = await getServerSession(req, res, authOptions)
  const hasAccess = hasAccessToDestId(destId, session)
  const username = session?.user?.email || 'Config Console Application'
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'ConfigConsoleSystemIP'

  return asyncLocalStorage.run({ username, ipAddress: ipAddress.toString() }, async () => {
    if (hasAccess) {
      logger.debug('Access granted to: ' + req.url)
      await next()
    } else {
      res.status(401).send('unauthorized')
      logger.debug('Access denied to: ' + req.url)
    }
  })
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
