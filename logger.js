import pino from 'pino'
import ecsFormat from '@elastic/ecs-pino-format'

const transport = pino.transport({
  targets: [
    {
      target: 'pino/file',
      options: { destination: `${__dirname}/logs/app.log` },
    },
    {
      target: 'pino/file',
    },
  ],
})
const logger = pino({
  level: process.env.PINO_LOG_LEVEL || 'info',
  transport,
  ecsFormat,
})

export default logger
