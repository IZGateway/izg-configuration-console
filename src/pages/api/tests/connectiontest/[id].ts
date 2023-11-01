import { URL } from 'url'
import type { NextApiRequest, NextApiResponse } from 'next'
import { constants } from 'http2'
import { ConnectionTestRequest } from '../../../../lib/connectiontests/types/ConnectionTestRequest'
import { ConnectionTestResult } from '../../../../lib/connectiontests/types/ConnectionTestResult'
import ConnectionTestFactory from '../../../../lib/connectiontests/ConnectionTestFactory'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import hasAccessToDestId from '../../../../lib/accesshelper'
import destination from '../../../../lib/queries/fetch/destination'
import desttypehelper from '../../../../lib/desttypehelper'
import destinationType from '../../../../lib/queries/fetch/destinationtype'
import logger from '../../../../../logger'
import withMiddleware from '../../api-middleware-helper'
/**
 * @swagger
 * /api/tests/connectiontest/{id}:
 *   get:
 *     summary: Get connection test results for destination by ID.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the destination.
 *       - name: destType
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: The type of the destination. Accepted Values (Development,Production,Staging,Onboarding,Testing,UNKNOWN)
 *     responses:
 *       200:
 *         description: OK.
 */

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const destId = req.query.id.toString()
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

      const destType = desttypehelper.destTypeFormattedToSyncWithDB(
        req.query.destType?.toString()
      )
      const destination_type = await destinationType(destType)

      const fetchedDestination = await destination(
        destId?.toString(),
        destination_type.type_id
      )

      const connectionTestResult = {
        user: session.user.email,
        timestamp: new Date(Date.now()).toISOString(),
        destId: destId,
        destUrl: '',
        destType: '',
        jurisdictionDescription: '',
        testResults: [
          {
            name: '',
            detail: '',
            status: null,
            order: -1,
            message: ``,
          },
        ],
      }
      if (!fetchedDestination) {
        connectionTestResult.destId = destId
        connectionTestResult.destUrl = 'unknown'
        connectionTestResult.testResults = [
          {
            name: '',
            detail:
              'No tests were run because the requested destination was not found.',
            status: null,
            order: -1,
            message: `The requested destination ${destId} was not found in our records.`,
          },
        ]
        res.status(constants.HTTP_STATUS_NOT_FOUND).json(connectionTestResult)
      } else if (
        fetchedDestination &&
        !isValidUrl(fetchedDestination.dest_uri)
      ) {
        connectionTestResult.destId = destId as string
        connectionTestResult.destUrl = fetchedDestination.dest_uri
        connectionTestResult.destType = fetchedDestination.destination_type.type
        connectionTestResult.jurisdictionDescription =
          fetchedDestination.jurisdiction?.description
        connectionTestResult.testResults = [
          {
            name: '',
            detail:
              "No tests were run because the requested destination's URL is malformed.",
            status: null,
            order: -1,
            message: `The URL retrieved for ${destId} is malformed`,
          },
        ]
        res
          .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
          .json(connectionTestResult)
      } else {
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
          desttypeid: destination_type.type_id,
          order: 0,
          certPath: IZG_ENDPOINT_CRT_PATH,
          keyPath: IZG_ENDPOINT_KEY_PATH,
          passphrase: IZG_ENDPOINT_PASSCODE,
        }

        logger.debug(
          'STARTING TESTS ON DEST ID: ' +
            destId +
            ' USING URL: ' +
            connectionTestRequest.hostname +
            ' ON PORT: ' +
            connectionTestRequest.port
        )

        let testCounter = 0
        for (const test of testSuite) {
          logger.debug('running test: ' + test + ' for destination ' + destId)
          connectionTestRequest.order = ++testCounter
          const T = ConnectionTestFactory.getConnectionTest(
            test,
            connectionTestRequest
          )
          const result = await T.run()
          testResults.push(...result)
          if (test === 'dns') {
            logger.debug('Resolved IP address is: ' + result[0]?.detail)
            connectionTestRequest.ip = result[0]?.detail
          }
        }

        connectionTestResult.destId = destId || 'unknown'
        connectionTestResult.destUrl = destIdURL.hostname || 'unknown'
        connectionTestResult.destType =
          fetchedDestination?.destination_type.type || 'unknown'
        connectionTestResult.jurisdictionDescription =
          fetchedDestination?.jurisdiction.description || 'unknown'
        connectionTestResult.testResults = testResults
        res.status(200).json(connectionTestResult)
      }
      logger.info('Connection Test Results', { req, res, connectionTestResult })
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
