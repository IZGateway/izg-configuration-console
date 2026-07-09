/* eslint-disable @typescript-eslint/no-var-requires */
import winston from 'winston'
import ecsFormat from '@elastic/ecs-winston-format'
import { asyncRequestContext } from './src/lib/Context'

let appVersion = 'unknown'
try {
  // Using require instead of dynamic import for synchronous loading
  appVersion = require('./package.json').version
} catch (error) {
  console.error('Failed to load package.json version:', error)
}

// Create a custom format for version
const versionFormat = winston.format((info) => {
  info.ConfigConsoleVersion = appVersion
  return info
})

/**
 * Enrich a log event with the authenticated user's identity for the current
 * request, read from the AsyncLocalStorage request context (IGDD-2223).
 *
 * Adds a single, additive `sessionUser` object — it never touches the existing
 * `user`/`sub` (or any other) fields, so existing log shapes and Elastic
 * queries are unaffected. Mirrors how the Hub's LogstashEncoder auto-includes
 * SLF4J MDC: every Node-runtime log event during an authenticated request gets
 * `sessionUser` (identity plus the correlation fields needed to pivot to the
 * Okta System Log: `authTime` + `ip`).
 *
 * No-ops when there is no request context (startup, background tasks) or when
 * the request is unauthenticated — it never fabricates identity and never
 * throws. `undefined` fields are dropped by JSON serialization.
 *
 * Exported for unit testing.
 */
export const injectUserContext = (info: winston.Logform.TransformableInfo) => {
  const ctx = asyncRequestContext.getStore()
  if (!ctx) return info
  // Only attach identity when an authenticated user is present.
  if (ctx.userId || ctx.email || ctx.sessionId) {
    info.sessionUser = {
      name: ctx.user,
      userId: ctx.userId,
      email: ctx.email,
      sessionId: ctx.sessionId,
      jti: ctx.jti,
      authTime: ctx.authTime,
      ip: ctx.ipAddress,
    }
  }
  return info
}

const userContextFormat = winston.format(injectUserContext)

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info', // Fail-safe. If LOG_LEVEL not set, default to info to hide sensitive information
  format: winston.format.combine(
    winston.format.uncolorize(),
    winston.format.errors({ stack: true }),
    versionFormat(),
    userContextFormat(),
    ecsFormat({ convertReqRes: true, apmIntegration: false })
  ),
  transports: [new winston.transports.Console()],
  exitOnError: false,
})

if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      //path to log file
      filename: 'log.json',
      dirname: 'logs',
    })
  )
}

//convert console log to winston ecs format to ship to elastic search
console.log = (...args) => logger.info.call(logger, ...args)
console.info = (...args) => logger.info.call(logger, ...args)
console.warn = (...args) => logger.warn.call(logger, ...args)
console.error = (...args) => logger.error.call(logger, ...args)
console.debug = (...args) => logger.debug.call(logger, ...args)

export default logger
