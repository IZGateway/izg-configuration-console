/* eslint-disable @typescript-eslint/no-var-requires */
import winston from 'winston'
import { ecsFields } from '@elastic/ecs-winston-format'
import { asyncRequestContext } from './src/lib/Context'
import { isPrimitive, toEcsUrlValue } from './src/lib/utils/ecsUrl'
import {
  ecsErrors,
  safeStringify,
  toEcsErrorValue,
} from './src/lib/utils/ecsError'

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

/**
 * A backstop as a winston format that never throws out of a log call: an event
 * it cannot read (a throwing getter) is passed on unchanged, and safeStringify
 * leaves out what cannot be read.
 */
const backstop = (
  normalize: (
    info: winston.Logform.TransformableInfo
  ) => winston.Logform.TransformableInfo
) =>
  winston.format((info) => {
    try {
      return normalize(info)
    } catch {
      return info
    }
  })

/**
 * Backstop: rewrite a top-level scalar `url` (or `URL`) into the ECS object
 * shape (IGDD-3541).
 *
 * The Elastic index maps `url` as an object, so a document with a scalar `url`
 * is rejected and filebeat drops it — while the event still prints to stdout,
 * so CloudWatch looks correct and nothing signals the loss. Call sites should
 * pass `toEcsUrl(...)` themselves; this catches the next one that doesn't.
 * Only a scalar or a `URL` is touched: any other object (including what
 * `convertReqRes` builds from `req`) passes through unchanged.
 *
 * Exported for unit testing.
 */
export const normalizeEcsUrl = (info: winston.Logform.TransformableInfo) => {
  const url = info.url
  const ecsUrl = toEcsUrlValue(url)
  if (ecsUrl !== url) info.url = ecsUrl
  return info
}

const ecsUrlFormat = backstop(normalizeEcsUrl)

/**
 * Backstop: rewrite a top-level scalar `user` into the ECS object shape
 * `{ name }` (IGDD-3541).
 *
 * metricbeat writes to the same data stream and sends `user` as an object
 * (`user.id` / `user.name` / `user.full_name`). The index template does not
 * pin `user`, so each new backing index types it from whichever document
 * arrives first. When metricbeat wins, every event with a string `user` —
 * every `API Request`, every AccessDenied — is rejected and filebeat drops
 * it. Writing the object here makes both writers agree, so the type no
 * longer depends on that race.
 *
 * Done only at serialization: call sites, the request context and the
 * DynamoDB audit records keep the plain string. A `user` that is not a scalar
 * (an object, or null) passes through unchanged.
 *
 * Exported for unit testing.
 */
export const normalizeEcsUser = (info: winston.Logform.TransformableInfo) => {
  if (isPrimitive(info.user)) {
    info.user = { name: String(info.user) }
  }
  return info
}

const ecsUserFormat = backstop(normalizeEcsUser)

/**
 * Backstop: write a top-level `error` that is not an Error in the ECS object
 * shape (IGDD-3541): a scalar as `{ message }`, and an object with each
 * `error.*` field as its one type (see `toEcsErrorValue`).
 *
 * Same race as `user`: ECS `error.*` objects reach the data stream from this
 * logger's Error handling, from filebeat's `add_error_key` and from metricbeat,
 * so a backing index can type `error` as an object, and then every event
 * logging `error: err.message` is rejected and dropped.
 *
 * Exported for unit testing.
 */
export const normalizeEcsError = (info: winston.Logform.TransformableInfo) => {
  if (info.error !== undefined) info.error = toEcsErrorValue(info.error)
  return info
}

const ecsErrorFormat = backstop(normalizeEcsError)

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info', // Fail-safe. If LOG_LEVEL not set, default to info to hide sensitive information
  format: winston.format.combine(
    ecsErrors({ defaultMeta: () => logger.defaultMeta }),
    winston.format.uncolorize(),
    versionFormat(),
    userContextFormat(),
    ecsUrlFormat(),
    ecsUserFormat(),
    ecsErrorFormat(),
    // ecsFormat, with Errors converted by ecsErrors and serialized by safeStringify.
    ecsFields({
      convertErr: false,
      convertReqRes: true,
      apmIntegration: false,
    }),
    safeStringify()
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
