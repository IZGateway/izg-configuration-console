import { URL } from 'url'
import type { NextApiRequest, NextApiResponse } from 'next'
import { constants } from 'http2'
import { ConnectionTestRequest } from '../../../../lib/connectiontests/types/ConnectionTestRequest'
import { ConnectionTestResult } from '../../../../lib/connectiontests/types/ConnectionTestResult'
import ConnectionTestFactory from '../../../../lib/connectiontests/ConnectionTestFactory'
import { APIResponse } from '../../../../lib/connectiontests/types/APIResponse'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import hasAccessToDestId from '../../../../lib/accesshelper'
import destination from '../../../../lib/queries/fetch/destination'
import logger from '../../../../../logger'
import _ from 'lodash'
import destinationChangeRequest from '../../../../lib/queries/fetch/destinationchangerequest'
import withMiddleware from '../../api-middleware-helper'
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

  const session = await getServerSession(req, res, authOptions)

  if (hasAccessToDestId(destId, session)) {
    if (req.method === 'GET') {
      const DEFAULT_PORT = 443
      const testSuite: string[] = [
        'dns',
        'tcp',
        'tls',
        'cipher',
        'wsdl',
        'connectivity',
        'qbp',
      ]
      const testResults: ConnectionTestResult[] = []
      let fetchedDestination
      let destTypeValue
      let jurisdictionDescriptionValue
      if (configuration === 'test') {
        fetchedDestination = await destination(destId?.toString(), destTypeId)
        destTypeValue = fetchedDestination.destination_type.type
        jurisdictionDescriptionValue =
          fetchedDestination.jurisdiction.description
      } else if (configuration === 'deploy') {
        fetchedDestination = await destinationChangeRequest(
          destId?.toString(),
          destTypeId
        )
        destTypeValue = fetchedDestination.destinations.destination_type.type
        jurisdictionDescriptionValue =
          fetchedDestination.destinations.jurisdiction.description
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
      if (!fetchedDestination) {
        res.status(constants.HTTP_STATUS_NOT_FOUND).json({
          destId: destId,
          destUrl: 'unknown',
          destType: '',
          jurisdictionDescription: '',
          testResults: [
            {
              name: '',
              detail:
                'No tests were run because the requested destination was not found.',
              status: null,
              order: -1,
              message: `The requested destination ${destId} was not found in our records.`,
            },
          ],
        })
      }
      if (fetchedDestination && !isValidUrl(fetchedDestination.dest_uri)) {
        res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
          destId: destId as string,
          destUrl: fetchedDestination.dest_uri,
          destType: destTypeValue,
          jurisdictionDescription: jurisdictionDescriptionValue,
          testResults: [
            {
              name: '',
              detail:
                "No tests were run because the requested destination's URL is malformed.",
              status: null,
              order: -1,
              message: `The URL retrieved for ${destId} is malformed`,
            },
          ],
        })
      }

      const IZG_ENDPOINT_CRT_PATH =
        process.env.IZG_ENDPOINT_CRT_PATH || undefined
      const IZG_ENDPOINT_KEY_PATH =
        process.env.IZG_ENDPOINT_KEY_PATH || undefined
      const IZG_ENDPOINT_PASSCODE =
        process.env.IZG_ENDPOINT_PASSCODE || undefined

      const destIdURL = convertUrlStringToUrlObject(
        fetchedDestination?.dest_uri
      )

      const connectionTestRequest: ConnectionTestRequest = {
        ip: '',
        port: +destIdURL.port || DEFAULT_PORT,
        hostname: destIdURL.hostname,
        path: destIdURL.pathname,
        id: destId as string,
        desttypeid: destTypeId,
        order: 0,
        certPath: IZG_ENDPOINT_CRT_PATH,
        keyPath: IZG_ENDPOINT_KEY_PATH,
        passphrase: IZG_ENDPOINT_PASSCODE,
      }

      logger.info(
        'STARTING TESTS ON DEST ID: ' +
          destId +
          ' USING URL: ' +
          connectionTestRequest.hostname +
          ' ON PORT: ' +
          connectionTestRequest.port
      )

      let testCounter = 0
      for (const test of testSuite) {
        logger.info('running test: ' + test + 'for destination' + destId)
        connectionTestRequest.order = ++testCounter
        const T = ConnectionTestFactory.getConnectionTest(
          test,
          connectionTestRequest
        )
        const result = await T.run()
        testResults.push(...result)
        if (test === 'dns') {
          logger.info('Resolved IP address is: ' + result[0]?.detail)
          connectionTestRequest.ip = result[0]?.detail
        }
      }

      res.status(200).json({
        destId: destId || 'unknown',
        destUrl: destIdURL.hostname || 'unknown',
        destType: destTypeValue || 'unknown',
        jurisdictionDescription: jurisdictionDescriptionValue || 'unknown',
        testResults,
      })
    } else {
      throw new Error(
        `The HTTP ${req.method} method is not supported at this route.`
      )
    }
  } else {
    res.status(401)
  }
}

const convertUrlStringToUrlObject = (urlString: string) => {
  return new URL(urlString)
}

const isValidUrl = (urlString: string) => {
  try {
    return Boolean(new URL(urlString))
  } catch (e) {
    return false
  }
}

export default withMiddleware()(handler)
