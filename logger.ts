import winston from 'winston'
import ecsFormat from '@elastic/ecs-winston-format'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: ecsFormat({ convertReqRes: true, apmIntegration: false }),
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

export default logger
