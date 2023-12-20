import type { NextApiRequest, NextApiResponse } from 'next'
import { constants } from 'http2'
import { APIResponse } from '../../../../lib/connectiontests/types/APIResponse'
import destination from '../../../../lib/queries/fetch/destination'
import _ from 'lodash'
import destinationChangeRequest from '../../../../lib/queries/fetch/destinationchangerequest'
import withMiddleware from '../../api-middleware-helper'
import connectionTest from '../../../../lib/connectiontests'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
/**
 * @swagger
 * /api/tests/connectiontest/{destTypeId}/{destId}:
 *   post:
 *     summary: Get connection test results by the destination values posted in request body
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the destination.
 *       - name: destTypeId
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *         description: The ID of destination type
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             values: object
 *             configuration: string
 *     responses:
 *       200:
 *         description: successfully received test results for the destination values posted in body.
 *         content:
 *           application/json:
 *       400:
 *         description: Bad request.
 */

const getFetchedDestination = async (
  destId: string,
  destTypeId: number,
  configuration?: string,
  values?: any
) => {
  let fetchedDestination
  let destTypeValue
  let jurisdictionDescriptionValue
  let data
  if (values) {
    fetchedDestination = { ...values, configuration: 'edit' }
    destTypeValue = values.type
    jurisdictionDescriptionValue = values.jurisdiction
  } else {
    if (configuration === 'test') {
      data = await destination(destId?.toString(), destTypeId)
      fetchedDestination = { ...data, configuration: 'test' }
      destTypeValue = fetchedDestination.destination_type.type
      jurisdictionDescriptionValue = fetchedDestination.jurisdiction.description
    } else if (configuration === 'deploy') {
      data = await destinationChangeRequest(destId?.toString(), destTypeId)
      fetchedDestination = { ...data, configuration: 'deploy' }
      destTypeValue = fetchedDestination.destinations.destination_type.type
      jurisdictionDescriptionValue =
        fetchedDestination.destinations.jurisdiction.description
    }
  }
  return {
    fetchedDestination,
    destTypeValue,
    jurisdictionDescriptionValue,
  }
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<APIResponse>
) => {
  const { slug } = req.query
  const destId = slug[1]
  const destTypeId = _.toNumber(slug[0])
  const { configuration, values } = req.body
  if (req.method === 'POST') {
    let fetchedDestination
    let destTypeValue
    let jurisdictionDescriptionValue
    const session = await getServerSession(req, res, authOptions)
    try {
      const result = await getFetchedDestination(
        destId?.toString(),
        destTypeId,
        configuration as string,
        values
      )
      fetchedDestination = result.fetchedDestination
      destTypeValue = result.destTypeValue
      jurisdictionDescriptionValue = result.jurisdictionDescriptionValue
    } catch (error) {
      res.status(constants.HTTP_STATUS_NOT_FOUND).json({
        destId: destId,
        destUrl: 'unknown',
        destType: '',
        jurisdictionDescription: '',
        testResults: [
          {
            name: '',
            detail: 'configuration passed was incorrect.',
            status: null,
            order: -1,
            message: error,
          },
        ],
      })
    }

    const { connectionTestResult } = await connectionTest(
      fetchedDestination,
      session.user.email
    )
    res.status(200).json({
      destId: destId || 'unknown',
      destUrl: fetchedDestination.dest_uri || 'unknown',
      destType: destTypeValue || 'unknown',
      jurisdictionDescription: jurisdictionDescriptionValue || 'unknown',
      testResults: connectionTestResult.testResults,
    })
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}

export default withMiddleware('checkAccessToDestIdSlug')(handler)
