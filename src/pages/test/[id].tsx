import * as React from 'react'
import TestConnection from '../../components/TestConnection'
import ErrorBoundary from '../../components/ErrorBoundary'
import Container from '../../components/Container'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import { InferGetServerSidePropsType } from 'next'
import logger from '../../../logger'
import hasAccessToDestId from '../../lib/accesshelper'
import ConnectionTestFactory from '../../lib/connectiontests/ConnectionTestFactory'
import { ConnectionTestRequest } from '../../lib/connectiontests/types/ConnectionTestRequest'
import { ConnectionTestResult } from '../../lib/connectiontests/types/ConnectionTestResult'
import desttypehelper from '../../lib/desttypehelper'
import destination from '../../lib/queries/fetch/destination'
import destinationType from '../../lib/queries/fetch/destinationtype'

enum TestSuite {
  'dns',
  'tcp',
  'tls',
  'cipher',
  'wsdl',
  'connectivity',
  'qbp',
}

export async function getServerSideProps(context) {
  const { req, res } = context
  const destId = context.query.id.toString()
  const session = await getServerSession(req, res, authOptions)
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
  if (hasAccessToDestId(destId, session)) {
    const DEFAULT_PORT = 443
    const testResults: ConnectionTestResult[] = []
    const destType = desttypehelper.destTypeFormattedToSyncWithDB(
      context.query.destType?.toString()
    )
    const destination_type = await destinationType(destType)
    const fetchedDestination = await destination(
      destId?.toString(),
      destination_type.type_id
    )

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
      throw new Error(`${JSON.stringify(connectionTestResult, null, 3)}`)
    } else if (fetchedDestination && !isValidUrl(fetchedDestination.dest_uri)) {
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
      throw new Error(`${JSON.stringify(connectionTestResult, null, 3)}`)
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
        `STARTING TESTS ON DEST ID: ${destId} USING URL: ${connectionTestRequest.hostname} ON PORT: ${connectionTestRequest.port} INITIATED BY: ${session.user.id}`
      )

      let testCounter = 0
      for (const test in TestSuite) {
        connectionTestRequest.order = ++testCounter
        const T = ConnectionTestFactory.getConnectionTest(
          TestSuite[test],
          connectionTestRequest
        )
        const result = await T.run()
        testResults.push(...result)
        if (TestSuite.dns || TestSuite.tcp) {
          if (result[0]?.status === 'FAIL') {
            break
          }
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
    }
    logger.debug('Connection Test Results', { req, res, connectionTestResult })
  }
  return {
    props: { connectionTestResult },
  }
}

const Test = (
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) => {
  return (
    <Container title="Test Connection">
      <ErrorBoundary>
        <TestConnection
          connectionTestResult={props.connectionTestResult}
          numberOfTests={Object.keys(TestSuite).length}
        />
      </ErrorBoundary>
    </Container>
  )
}

export default Test

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
