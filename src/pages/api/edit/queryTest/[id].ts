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
import jurisdiction from '../../../../lib/queries/fetch/jurisdiction'
import desttypehelper from '../../../../lib/desttypehelper'
import destinationType from '../../../../lib/queries/fetch/destinationtype'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse>
) {
  const destId = req.query.id.toString()
  const session = await getServerSession(req, res, authOptions)
  const destType = desttypehelper.destTypeFormattedToSyncWithDB(
    req.query.destType.toString()
  )
  if (hasAccessToDestId(destId, session)) {
    if (req.method === 'GET') {
      const DEFAULT_PORT = 443
      const testSuite = 'qbp'
      const testResults: ConnectionTestResult[] = []
      const destination_type = await destinationType(destType)
      const fetchedDestination = await destination(
        destId?.toString(),
        destination_type.type_id
      )
      //const fetchedJurisdiction = await jurisdiction(destId?.toString())

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
          jurisdictionDescription: fetchedDestination?.jurisdiction.description,
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

      console.info(
        'STARTING TESTS ON DEST ID: ' +
          destId +
          ' USING URL: ' +
          connectionTestRequest.hostname +
          ' ON PORT: ' +
          connectionTestRequest.port
      )

      let testCounter = 0

      connectionTestRequest.order = ++testCounter
      const T = ConnectionTestFactory.getConnectionTest(
        testSuite,
        connectionTestRequest
      )
      const result = await T.run()
      testResults.push(...result)

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
