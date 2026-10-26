import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import withMiddleware from '../../../lib/api/api-middleware-helper'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import {
  elasticClient,
  getConsoleElasticIndex,
} from '../../../lib/repositories/ElasticRepository'
import { logAccessDenied } from '../../../lib/security/accessDeniedAudit'
import { subjectOf } from '../../../lib/security/authzsubject'
import { can } from '../../../lib/security/policy'
import {
  ConsoleScopeData,
  parseConsoleMetricsRequest,
  planConsoleMetricsQuery,
  scopeDataNeeded,
} from '../../../lib/console/consoleMetrics'
import logger from '../../../../logger'

/**
 * Read only the lookup tables the view needs. The destination view needs none,
 * and inbound needs organizations only when one is selected.
 *
 * Unfiltered on purpose: these resolve destId and organization names, they are
 * not returned to the caller, and destId itself is authorized before this runs.
 * `fetchAllDestinations` is used rather than `fetchLoggedInUsersDestinations`
 * because it does not decrypt destination passwords, which this route never
 * needs (and one undecryptable row would otherwise fail every request).
 */
async function loadScopeData(needs: {
  destinations: boolean
  organizations: boolean
}): Promise<ConsoleScopeData> {
  if (!needs.destinations && !needs.organizations) {
    return { destinations: [], organizations: [] }
  }
  const dbClient = await DbClientFactory.getDbClient()
  const [destinations, organizations] = await Promise.all([
    needs.destinations ? dbClient.fetchAllDestinations() : [],
    needs.organizations ? dbClient.fetchOrganizations() : [],
  ])
  return { destinations, organizations }
}

/**
 * @swagger
 * /api/console/metrics:
 *   post:
 *     summary: Console widget metrics for one destination
 *     description: >
 *       Builds the Elasticsearch query for a /console widget on the server and
 *       applies the caller's jurisdiction restriction. The caller names a view
 *       and a destination; it never supplies query DSL.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [view, destId]
 *             properties:
 *               view:
 *                 type: string
 *                 enum: [destination, inbound, outbound]
 *               destId:
 *                 type: string
 *               envTag:
 *                 type: string
 *                 enum: [prod, onboard, staging, dev, test]
 *               organization:
 *                 type: string
 *     responses:
 *       200:
 *         description: >
 *           Raw Elasticsearch aggregation response, or `{ unavailable: <reason> }`
 *           when the selection resolves to nothing the caller may see (no
 *           query is run).
 *       400:
 *         description: Invalid request body
 *       403:
 *         description: Caller may not view the console for this destination
 *       405:
 *         description: Method not allowed
 *       500:
 *         description: Elasticsearch not configured or query failed
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized - Please login' })
  }

  const parsed = parseConsoleMetricsRequest(req.body)
  if (!parsed.ok) {
    return res.status(400).json({ error: 'Bad Request', message: parsed.message })
  }
  const request = parsed.value

  // The middleware has already run the ANY_JURISDICTION prefilter. This is the
  // real decision: ONE held role must grant canViewConsole AND reach destId.
  // A subject-wide union of the two (capability from a scoped role, reach from
  // an unrelated global one) is the split-decision shape and must not pass.
  const subject = subjectOf(session)
  if (!can(subject, 'console', 'canViewConsole', request.destId).allowed) {
    logAccessDenied({
      reason: 'Destination outside caller reach',
      url: req.url,
      method: req.method,
      user: session.user.email,
      roles: subject.roles,
      destId: request.destId,
      deniedAt: 'api',
      page: 'console',
      permission: 'console.canViewConsole',
    })
    return res.status(403).json({
      error: 'Forbidden - destination outside your jurisdiction',
    })
  }

  if (!elasticClient.isConfigured()) {
    return res.status(500).json({
      error: 'Server Error',
      message: 'Elasticsearch is not properly configured',
    })
  }

  try {
    const data = await loadScopeData(scopeDataNeeded(request))
    const plan = planConsoleMetricsQuery(request, data)
    if (plan.unavailable) {
      logger.info('Console metrics: nothing in scope, Elasticsearch not queried', {
        operation: 'console_metrics',
        view: request.view,
        destId: request.destId,
        user: session.user.email,
      })
      return res.status(200).json({ unavailable: plan.unavailable })
    }

    const index = getConsoleElasticIndex()
    const result = await elasticClient.query(
      index,
      plan.query,
      session.user.email || undefined
    )

    logger.info('Console metrics query successful', {
      operation: 'console_metrics',
      view: request.view,
      destId: request.destId,
      envTag: request.envTag,
      user: session.user.email,
      index,
    })

    return res.status(200).json(result)
  } catch (error) {
    logger.error('Console metrics query error', {
      operation: 'console_metrics',
      view: request.view,
      destId: request.destId,
      error: error instanceof Error ? error.message : String(error),
      user: session.user.email,
    })
    return res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred while querying Elasticsearch',
    })
  }
}

// The declaration is the coarse gate (does any held role hold the capability at
// all); the per-destination, same-role decision is made in the handler above
// with `can()`, the pattern `requireApiKeyAccess` uses in apiKeyAuthz.ts.
export default withMiddleware(
  { capability: { page: 'console', capability: 'canViewConsole' } },
  'captureErrors'
)(handler)
