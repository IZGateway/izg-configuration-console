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
import desttypehelper from '../../../../lib/desttypehelper'
import destinationType from '../../../../lib/queries/fetch/destinationtype'
import logger from '../../../../../logger'
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse>
) {
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
      // const fetchedJurisdiction = await jurisdiction(destId?.toString())

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
          destType: fetchedDestination.destination_type.type,
          jurisdictionDescription: fetchedDestination.jurisdiction?.description,
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
        desttypeid: destination_type.type_id,
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
      // eslint-disable-next-line no-loops/no-loops
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
        destType: fetchedDestination?.destination_type.type || 'unknown',
        jurisdictionDescription:
          fetchedDestination?.jurisdiction.description || 'unknown',
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
