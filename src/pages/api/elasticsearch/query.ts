import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import withMiddleware from '../../../lib/api/api-middleware-helper'
import { elasticClient } from '../../../lib/repositories/ElasticRepository'
import { fetchSystemResources } from '../../../lib/console/systemResources'
import logger from '../../../../logger'

/**
 * The Home "System Resources" (Console — status report) widget's data.
 *
 * [IGDD-3474] This route used to forward any caller-supplied Elasticsearch
 * body. IGDD-3170 opened it to every signed-in role for bodies carrying the
 * four system-resources aggregation names, and required canViewConsole for
 * anything else — but recognizing the widget by its aggregation NAMES let any
 * signed-in caller add those names to an arbitrary query (`match_all`,
 * `size: 10000`) and read every jurisdiction's log documents.
 *
 * It is now a body-less GET that runs only the fixed, server-built
 * status-report query: `size: 0`, host-metric aggregations, no log documents.
 * There is no caller input to validate or forward. The /console log search
 * has its own route, /api/console/metrics, which builds its queries on the
 * server and applies the caller's jurisdiction restriction.
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({
      error: 'Method Not Allowed',
      message:
        'Only GET is supported. Console log search uses /api/console/metrics.',
    })
  }

  if (!elasticClient.isConfigured()) {
    return res.status(500).json({
      error: 'Server Error',
      message: 'Elasticsearch is not properly configured',
    })
  }

  try {
    const data = await fetchSystemResources(session.user.email || undefined)
    res.status(200).json(data)
  } catch (error) {
    logger.error('Elasticsearch system resources query error', {
      operation: 'elasticsearch_query',
      error: error instanceof Error ? error.message : String(error),
      user: session?.user?.email,
    })

    res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred while querying Elasticsearch',
    })
  }
}

// Every signed-in role may read the status report (target matrix: "Console —
// status report" is granted to all roles). It returns hub-wide host metrics
// only, no tenant data, so there is no capability or reach to decide.
export default withMiddleware({ session: true })(handler)
