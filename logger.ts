/* eslint-disable @typescript-eslint/no-var-requires */
import winston from 'winston'
import ecsFormat from '@elastic/ecs-winston-format'

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

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: winston.format.combine(
    winston.format.uncolorize(),
    winston.format.errors({ stack: true }),
    versionFormat(),
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
