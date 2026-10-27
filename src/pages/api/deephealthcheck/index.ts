import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../../../lib/api/api-middleware-helper'
import logger from '../../../../logger'

import * as fs from 'fs'
import path from 'path'
import https from 'https'
import axios from 'axios'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import { asyncRequestContext } from '../../../lib/Context'

/** The result of probing one dependency. */
interface ComponentHealth {
  component: string
  status: string
  statusAt: string
  /** May carry an upstream error message, so it is withheld from anonymous callers. */
  reason?: string
  /** The dependency's address, including internal load balancer DNS names. */
  url?: string
  healthy?: boolean
  exception?: string
  oktaGlobalStatusEndpoint?: string
}

/**
 * What a caller outside OPERATIONS_GROUP may see of a component result (IGDD-3178).
 *
 * This route is deliberately public so the load balancer can reach it without a
 * credential, which means the full result was reaching anonymous callers: upstream
 * error messages, the Okta issuer, the Jira health URL, and the internal ALB DNS name
 * and port behind `IZG_HEALTHCHECK_URL`.
 */
type PublicComponentHealth = Pick<
  ComponentHealth,
  'component' | 'status' | 'statusAt'
>

/**
 * Project a component result down to the fields a non-admin caller may see.
 *
 * An allowlist rather than a redaction: the result is rebuilt from three named
 * fields, so a field added to any probe later is withheld by default instead of
 * being disclosed until someone remembers to strip it.
 */
const publicView = (result: ComponentHealth): PublicComponentHealth => ({
  component: result.component,
  status: result.status,
  statusAt: result.statusAt,
})

/**
 * @swagger
 * /api/deephealthcheck:
 *   get:
 *     summary: Reports reachability of each dependency (DB, Okta, Jira, IZ Gateway).
 *     description: >
 *       Callers in OPERATIONS_GROUP receive the full result for each component.
 *       Every other caller — the load balancer probe and signed-in non-admin users
 *       alike — receives only the component name, its status and the time it was
 *       taken. The HTTP status code does not depend on the caller.
 *     responses:
 *       200:
 *         description: OK.
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const deepHealthCheckResults: ComponentHealth[] = []
  const checkConnections = ['DB', 'OKTA', 'JIRA', 'IZG']

  // Membership of OPERATIONS_GROUP, the same axis `checkAdmin` enforces — not mere
  // authentication. There is no `signIn` callback, so anyone who completes the Okta
  // flow holds a session; gating the detail on `session.user` alone would disclose
  // dependency addresses to a tenant user with no roles and no capabilities anywhere
  // else in the console. The context is populated by `withMiddleware` for public
  // routes too, so reading it here needs no extra session plumbing.
  const isAdmin = Boolean(
    asyncRequestContext.getStore()?.session?.user?.isAdmin
  )
  const publicDeepHealthCheckResults = () =>
    deepHealthCheckResults.map(publicView)

  // DATABASE
  const databaseStatus = async (): Promise<ComponentHealth> => {
    try {
      const dbClient = await DbClientFactory.getDbClient()
      if (await dbClient.isDatabaseConnected()) {
        return {
          component: 'DB',
          status: 'connected',
          statusAt: new Date(Date.now()).toISOString(),
          reason: 'connected to database',
        }
      }
      // `isDatabaseConnected()` resolving false is a negative answer rather than a
      // throw, so it never reached the catch below and the function returned the
      // empty object it was initialized with — a result carrying no component,
      // status or statusAt at all. Reported as `{}` in the array.
      return {
        component: 'DB',
        status: 'unable to connect',
        statusAt: new Date(Date.now()).toISOString(),
        reason: 'database reported not connected',
      }
    } catch (error) {
      return {
        component: 'DB',
        status: 'unable to connect',
        statusAt: new Date(Date.now()).toISOString(),
        reason: error.message,
      }
    }
  }

  //JIRA
  const jiraStatus = async (): Promise<ComponentHealth> => {
    const jiraEndpoint = process.env.JIRA_HEALTHCHECK_URL || 'unknown'
    try {
      const response = await fetch(jiraEndpoint)
      const data = await response.json()
      logger.debug('Jira health check response', { data })
      return {
        component: 'JIRA',
        status: 'connected',
        statusAt: new Date(Date.now()).toISOString(),
        reason: 'health check passed',
        url: jiraEndpoint,
      }
    } catch (error) {
      return {
        component: 'JIRA',
        status: 'unable to connect',
        statusAt: new Date(Date.now()).toISOString(),
        reason: error.message,
        url: jiraEndpoint,
      }
    }
  }

  // IZGATEWAY
  const izgwStatus = async (): Promise<ComponentHealth> => {
    let izgwHealthCheck: ComponentHealth
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
  const oktaStatus = async (): Promise<ComponentHealth> => {
    const oktaEndpoint =
      process.env.NEXT_PUBLIC_OKTA_ISSUER +
        '/.well-known/openid-configuration' || 'unknown'
    try {
      const response = await fetch(oktaEndpoint)
      const data = await response.json()
      logger.debug('okta config api response', { data })
      return {
        component: 'OKTA',
        status: 'connected',
        statusAt: new Date(Date.now()).toISOString(),
        reason: 'received configuration api response',
        url: oktaEndpoint,
        oktaGlobalStatusEndpoint: 'https://status.okta.com',
      }
    } catch (error) {
      return {
        component: 'OKTA',
        status: 'unable to connect',
        statusAt: new Date(Date.now()).toISOString(),
        reason: error.message,
        url: oktaEndpoint,
        oktaGlobalStatusEndpoint: 'https://status.okta.com',
      }
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
    // Always logged in full, whoever asked: the log is the operator's view and is
    // not part of the response.
    logger.info('Deep Health Check', { deepHealthCheckResults })
    res
      .status(200)
      .json(isAdmin ? deepHealthCheckResults : publicDeepHealthCheckResults())
  } catch (error) {
    // The status code does not depend on the caller, so the load balancer probe is
    // unaffected either way; only the body varies. An uncaught error here is almost
    // always a misconfigured IZG_ENDPOINT_* path, whose message names a filesystem
    // path, so an anonymous caller gets no message at all.
    logger.error('Deep Health Check failed', { errorMessage: error.message })
    res.status(503).json(isAdmin ? error.message : 'Service Unavailable')
  }
}
export default withMiddleware({
  public:
    'Readiness probe for the load balancer; reports dependency reachability, not data. ' +
    'Callers get component/status/statusAt only — the handler widens the body for ' +
    'OPERATIONS_GROUP, but never narrows access.',
})(handler)
