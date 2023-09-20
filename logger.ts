import winston from 'winston'
import ecsFormat from '@elastic/ecs-winston-format'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: ecsFormat({ convertReqRes: true }),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      //path to log file
      filename: 'log.json',
      dirname: 'logs',
    }),
  ],
  exitOnError: false,
})

export default logger
