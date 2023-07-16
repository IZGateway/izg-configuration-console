import { URL } from 'url'
import type { NextApiRequest, NextApiResponse } from 'next'
import { constants } from 'http2'
import { ConnectionTestRequest } from '../../../../lib/connectiontests/types/ConnectionTestRequest'
import { ConnectionTestResult } from '../../../../lib/connectiontests/types/ConnectionTestResult'
import ConnectionTestFactory from '../../../../lib/connectiontests/ConnectionTestFactory'
import { APIResponse } from '../../../../lib/connectiontests/types/APIResponse'
import { prismacontext } from '../../../../lib/prismacontext'

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse<APIResponse>
) {
  const DEFAULT_PORT = 443
  const {
    query: { id },
  } = request
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
  const destination = await lookupDestination(id?.toString())
  const jurisdiction = await lookupJurisdiction(id?.toString())

  if (!destination) {
    response.status(constants.HTTP_STATUS_NOT_FOUND).json({
      destId: id,
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
          message: `The requested destination ${id} was not found in our records.`,
        },
      ],
    })
  }
  if (destination && !isValidUrl(destination.dest_uri)) {
    response.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
      destId: id as string,
      destUrl: destination.dest_uri,
      destType: destination.destination_type.type,
      jurisdictionDescription: jurisdiction?.description,
      testResults: [
        {
          name: '',
          detail:
            "No tests were run because the requested destination's URL is malformed.",
          status: null,
          order: -1,
          message: `The URL retrieved for ${id} is malformed`,
        },
      ],
    })
  }

  const IZG_ENDPOINT_CRT_PATH = process.env.IZG_ENDPOINT_CRT_PATH || undefined
  const IZG_ENDPOINT_KEY_PATH = process.env.IZG_ENDPOINT_KEY_PATH || undefined
  const IZG_ENDPOINT_PASSCODE = process.env.IZG_ENDPOINT_PASSCODE || undefined

  const destIdURL = convertUrlStringToUrlObject(destination?.dest_uri)

  const connectionTestRequest: ConnectionTestRequest = {
    ip: '',
    port: +destIdURL.port || DEFAULT_PORT,
    hostname: destIdURL.hostname,
    path: destIdURL.pathname,
    id: id as string,
    order: 0,
    certPath: IZG_ENDPOINT_CRT_PATH,
    keyPath: IZG_ENDPOINT_KEY_PATH,
    passphrase: IZG_ENDPOINT_PASSCODE,
  }

  console.info(
    'STARTING TESTS ON DEST ID: ' +
      id +
      ' USING URL: ' +
      connectionTestRequest.hostname +
      ' ON PORT: ' +
      connectionTestRequest.port
  )

  let testCounter = 0
  // eslint-disable-next-line no-loops/no-loops
  for (const test of testSuite) {
    console.info('running test: ' + test)
    connectionTestRequest.order = ++testCounter
    const T = ConnectionTestFactory.getConnectionTest(
      test,
      connectionTestRequest
    )
    const result = await T.run()
    testResults.push(...result)
    if (test === 'dns') {
      console.info('Resolved IP address is: ' + result[0]?.detail)
      connectionTestRequest.ip = result[0]?.detail
    }
  }

  response.status(200).json({
    destId: id || 'unknown',
    destUrl: destIdURL.hostname || 'unknown',
    destType: destination?.destination_type.type || 'unknown',
    jurisdictionDescription: jurisdiction?.description || 'unknown',
    testResults,
  })
}

async function lookupDestination(destId: string) {
  return await prismacontext.prisma.destinations.findUnique({
    include: { destination_type: true },
    where: { dest_id: destId.toString() },
  })
}

async function lookupJurisdiction(destId: string) {
  return await prismacontext.prisma.jurisdiction.findFirst({
    where: { dest_id: destId.toString() },
  })
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
