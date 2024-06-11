import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'
import { prismacontext } from '../../../lib/prismacontext'
import * as fs from 'fs'
import path from 'path'
import https from 'https'
import axios from 'axios'
/**
 * @swagger
 * /api/deephealthcheck:
 *   get:
 *     summary: returns HTTP OK (200).
 *     responses:
 *       200:
 *         description: OK.
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const deepHealthCheckResults = []
  const checkConnections = ['DB', 'OKTA', 'JIRA', 'IZG']

  // DATABASE
  const databaseStatus = async () => {
    let dbConnectionCheck = {}
    try {
      const query = await prismacontext.prisma.$queryRaw<any[]>`SELECT 1`

      if (query.length >= 1) {
        dbConnectionCheck = {
          component: 'DB',
          status: 'connected',
          statusAt: new Date(Date.now()).toISOString(),
          reason: 'connected to database',
        }
        return dbConnectionCheck
      }
    } catch (error) {
      dbConnectionCheck = {
        component: 'DB',
        status: 'unable to connect',
        statusAt: new Date(Date.now()).toISOString(),
        reason: error.message,
      }
    }
    return dbConnectionCheck
  }

  //JIRA
  const jiraStatus = async () => {
    let jiraHealthCheck = {}
    const jiraEndpoint = process.env.JIRA_HEALTHCHECK_URL || 'unknown'
    try {
      const response = await fetch(jiraEndpoint)
      const data = await response.json()
      logger.debug('Jira health check response', { data })
      jiraHealthCheck = {
        component: 'JIRA',
        status: 'connected',
        statusAt: new Date(Date.now()).toISOString(),
        reason: 'health check passed',
        url: jiraEndpoint,
      }
      return jiraHealthCheck
    } catch (error) {
      jiraHealthCheck = {
        component: 'JIRA',
        status: 'unable to connect',
        statusAt: new Date(Date.now()).toISOString(),
        reason: error.message,
        url: jiraEndpoint,
      }
      return jiraHealthCheck
    }
  }

  // IZGATEWAY
  const izgwStatus = async () => {
    let izgwHealthCheck = {}
    const IZG_HEALTHCHECK_ENDPOINT =
      process.env.IZG_HEALTHCHECK_URL || 'unknown'
    const IZG_ENDPOINT_CRT_PATH = process.env.IZG_ENDPOINT_CRT_PATH || undefined
    const IZG_ENDPOINT_KEY_PATH = process.env.IZG_ENDPOINT_KEY_PATH || undefined
    const IZG_ENDPOINT_PASSCODE = process.env.IZG_ENDPOINT_PASSCODE || undefined
    const httpsAgentOptions = {
      cert: fs.readFileSync(path.resolve(IZG_ENDPOINT_CRT_PATH), 'utf-8'),
      key: fs.readFileSync(path.resolve(IZG_ENDPOINT_KEY_PATH), 'utf-8'),
      passphrase: IZG_ENDPOINT_PASSCODE,
      rejectUnauthorized: false,
      keepAlive: true,
    }
    const responseData = await axios
      .get(IZG_HEALTHCHECK_ENDPOINT, {
        httpsAgent: new https.Agent(httpsAgentOptions),
        timeout: 30000,
      })
      .then((response) => {
        const data = response.data
        logger.info('IZG Health Status', { data })
        if (data.healthy) {
          izgwHealthCheck = {
            component: 'IZG',
            status: 'connected',
            statusAt: data.statusAt,
            reason: data.lastChangeReason,
            healthy: data.healthy,
            url: IZG_HEALTHCHECK_ENDPOINT,
          }
        } else {
          izgwHealthCheck = {
            component: 'IZG',
            status: 'connected but status not healthy',
            statusAt: data.statusAt,
            reason: data.lastChangeReason,
            exception: data.lastException,
            healthy: data.healthy,
            url: IZG_HEALTHCHECK_ENDPOINT,
          }
        }
        return izgwHealthCheck
      })
      .catch((error) => {
        izgwHealthCheck = {
          component: 'IZG',
          status: 'unable to connect',
          statusAt: new Date(Date.now()).toISOString(),
          reason: error.message,
          url: IZG_HEALTHCHECK_ENDPOINT,
        }
        return izgwHealthCheck
      })
    return responseData
  }

  // OKTA
  const oktaStatus = async () => {
    let oktaHealthCheck = {}
    const oktaEndpoint =
      process.env.OKTA_ISSUER + '/.well-known/openid-configuration' || 'unknown'
    try {
      const response = await fetch(oktaEndpoint)
      const data = await response.json()
      logger.debug('okta config api response', { data })
      oktaHealthCheck = {
        component: 'OKTA',
        status: 'connected',
        statusAt: new Date(Date.now()).toISOString(),
        reason: 'received configuration api response',
        url: oktaEndpoint,
        oktaGlobalStatusEndpoint: 'https://status.okta.com',
      }
      return oktaHealthCheck
    } catch (error) {
      oktaHealthCheck = {
        component: 'OKTA',
        status: 'unable to connect',
        statusAt: new Date(Date.now()).toISOString(),
        reason: error.message,
        url: oktaEndpoint,
        oktaGlobalStatusEndpoint: 'https://status.okta.com',
      }
      return oktaHealthCheck
    }
  }

  try {
    for (const component of checkConnections) {
      if (component === 'DB') {
        const dbConnectionCheck = await databaseStatus()
        deepHealthCheckResults.push(dbConnectionCheck)
      }
      if (component === 'JIRA') {
        const jiraHealthCheck = await jiraStatus()
        deepHealthCheckResults.push(jiraHealthCheck)
      }
      if (component === 'IZG') {
        const izgwHealthCheck = await izgwStatus()
        deepHealthCheckResults.push(izgwHealthCheck)
      }
      if (component === 'OKTA') {
        const oktaCheck = await oktaStatus()
        deepHealthCheckResults.push(oktaCheck)
      }
    }
    logger.info('Deep Health Check', { deepHealthCheckResults })
    res.status(200).json(deepHealthCheckResults)
  } catch (error) {
    res.status(503).json(error.message)
  }
}
export default withMiddleware()(handler)
