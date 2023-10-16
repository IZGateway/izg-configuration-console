import { label, Middleware } from 'next-api-middleware'
import { authOptions } from './auth/[...nextauth]'
import { getServerSession } from 'next-auth'
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
const addLogging: Middleware = async (req, res, next) => {
  logger.info('Api request path ' + req.url, { req, res })
  await next()
}

// check access to destination
const checkAccessToDestId: Middleware = async (req, res, next) => {
  const destId = req.query.id.toString()
  const session = await getServerSession(req, res, authOptions)
  const hasAccess = hasAccessToDestId(destId, session)
  if (hasAccess) {
    await next()
  } else {
    res.status(401).send('unauthorized')
  }
}

const withMiddleware = label(
  {
    addLogging,
    captureErrors,
    checkAccessToDestId,
  },
  ['addLogging', 'captureErrors'] //default functions
)

export default withMiddleware
