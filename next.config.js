const {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_SERVER,
  PHASE_PRODUCTION_BUILD,
} = require('next/constants')
const winston = require('winston')
const ecsFormat = require('@elastic/ecs-winston-format')
let logged = false

module.exports = async (phase, { defaultConfig }) => {
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: true,
    eslint: {
      dirs: ['src', 'pages'],
    },
    images: {
      unoptimized: true,
    },
    headers: async () => {
      return [
        {
          source: '/:path*{/}?',
          headers: [
            {
              key: 'X-Frame-Options',
              value: 'DENY',
            },
            {
              key: 'X-XSS-Protection',
              value: '1; mode=block',
            },
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
            {
              key: 'cache-control',
              value: 'no-cache, no-store, must-revalidate',
            },
          ],
        },
      ]
    },
    env: {
      OPERATIONS_GROUP: `${process.env.OPERATIONS_GROUP}`,
      USER_GROUP: `${process.env.USER_GROUP}`,
      NEXT_PUBLIC_ELASTIC_ENV_TAG: `${process.env.ELASTIC_ENV_TAG || 'dev'}`,
      NEXT_PUBLIC_ELASTIC_INDEX: `${
        process.env.OPERATIONS_CONSOLE_ELASTIC_INDEX || 'izgw-dev-logstash'
      }`,
    },
    webpack(config, { nextRuntime }) {
      // as of Next.js latest versions, the nextRuntime is preferred over `isServer`, because of edge-runtime
      if (typeof nextRuntime === 'undefined') {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
        }
      }
      return config
    },
  }

  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'debug',
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
  if (!logged) {
    logged = true
    if (phase === PHASE_DEVELOPMENT_SERVER) {
      logger.info(`Config Console Service started in ${process.uptime()} s`, {
        'startup-phase': phase,
      })
    } else if (
      process.argv.includes('start') &&
      phase === PHASE_PRODUCTION_SERVER
    ) {
      logger.info('Config Console Service started in ${process.uptime()} s', {
        'startup-phase': phase,
      })
    } else if (
      process.argv.includes('build') &&
      phase === PHASE_PRODUCTION_BUILD
    ) {
      logger.info('Config Console Service built in ${process.uptime()} s', {
        'build-phase': phase,
      })
    }
  }

  logger.debug(
    'NEXT_MANUAL_SIG_HANDLE set to ' + process.env.NEXT_MANUAL_SIG_HANDLE
  )

  if (process.env.NEXT_MANUAL_SIG_HANDLE) {
    const signals = [
      'SIGHUP',
      'SIGINT',
      'SIGQUIT',
      'SIGILL',
      'SIGTRAP',
      'SIGABRT',
      'SIGBUS',
      'SIGFPE',
      'SIGUSR1',
      'SIGSEGV',
      'SIGUSR2',
      'SIGTERM',
    ]

    for (const signal of signals) {
      process.on(signal, () => {
        logger.info(
          `Received ${signal} - Config Console server shutting down`,
          {
            signal: signal,
            'shutdown-reason': 'signal-received',
          }
        )
        process.exit(0)
      })
    }
  }

  return nextConfig
}
