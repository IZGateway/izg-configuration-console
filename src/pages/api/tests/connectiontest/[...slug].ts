import type { NextApiRequest, NextApiResponse } from 'next'
import { constants } from 'http2'
import { APIResponse } from '../../../../lib/connectiontests/types/APIResponse'
import destination from '../../../../lib/queries/fetch/destination'
import _ from 'lodash'
import destinationChangeRequest from '../../../../lib/queries/fetch/destinationchangerequest'
import withMiddleware from '../../api-middleware-helper'
import connectionTest from '../../../../lib/connectiontests'
import { Destination } from '../../../../lib/types/Destination'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
/**
 * @swagger
 * /api/tests/connectiontest/{destTypeId}/{destId}?configuration=test/deploy:
 *   get:
 *     summary: Get connection test results for destination by ID.
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
 *       - name: configuration
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: It is call made from to this api( options: test/deploy)
 *     responses:
 *       200:
 *         description: OK.
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<APIResponse>
) => {
  const { slug } = req.query
  const destId = slug[1]
  const destTypeId = _.toNumber(slug[0])
  const configuration = req.query.configuration

  if (req.method === 'GET') {
    let fetchedDestinationChangeRequest
    let destTypeValue
    let jurisdictionDescriptionValue
    let destinationToTest: Destination = {
      dest_id: '',
      dest_uri: '',
      dest_version: '',
      username: '',
      MSH6: '',
      MSH22: '',
      MSH3: '',
      MSH4: '',
      MSH5: '',
      RXA11: '',
      facility_id: '',
      pass_expiry: undefined,
      destination_type: {
        type: '',
        type_id: 0,
      },
      jurisdiction: {
        name: '',
        description: '',
      },
    }
    const session = await getServerSession(req, res, authOptions)
    if (configuration === 'test') {
      destinationToTest = await destination(destId?.toString(), destTypeId)
      destTypeValue = destinationToTest.destination_type.type
      jurisdictionDescriptionValue = destinationToTest.jurisdiction.description
    } else if (configuration === 'deploy') {
      fetchedDestinationChangeRequest = await destinationChangeRequest(
        destId?.toString(),
        destTypeId
      )
      destTypeValue =
        fetchedDestinationChangeRequest.destinations.destination_type.type
      jurisdictionDescriptionValue =
        fetchedDestinationChangeRequest.destinations.jurisdiction.description
      destinationToTest.dest_id = fetchedDestinationChangeRequest.dest_id
      destinationToTest.dest_uri = fetchedDestinationChangeRequest.dest_uri
      destinationToTest.destination_type =
        fetchedDestinationChangeRequest.destinations.destination_type
      destinationToTest.jurisdiction =
        fetchedDestinationChangeRequest.destinations.jurisdiction
    } else {
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
            message: `configuration passed was incorrect.`,
          },
        ],
      })
    }
    const { connectionTestResult } = await connectionTest(
      destinationToTest,
      session.user.email
    )
    res.status(200).json({
      destId: destId || 'unknown',
      destUrl: destinationToTest.dest_uri || 'unknown',
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
