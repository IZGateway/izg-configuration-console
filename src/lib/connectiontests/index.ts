import moment from 'moment'
import logger from '../../../logger'
import IZGHubStatusHistoryEndpoint from '../IZGHubStatusHistoryEndpoint'
import { Destination } from '../type/Destination'
import ConnectionTestFactory from './ConnectionTestFactory'
import { TestStatus } from './TestStatus'
import { ConnectionTestRequest } from './types/ConnectionTestRequest'
import { ConnectionTestResult } from './types/ConnectionTestResult'

type UserContext = {
  name?: string
  email?: string
  id?: string
}

const connectionTest = async (destination: Destination, user: UserContext) => {
  enum TestSuite {
    'dns',
    'tcp',
    'tls',
    'cipher',
    'wsdl',
    'connectivity',
    'qbp',
  }

  const testSuiteKeys = Object.keys(TestSuite).filter((v) => isNaN(Number(v)))
  const numberOfTests = testSuiteKeys.length
  const connectionTestResult = {
    user: user.email || 'unknown',
    timestamp: new Date(Date.now()).toISOString(),
    destId: destination?.destId || 'unknown',
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
        type: '',
      },
    ],
  }
  const DEFAULT_PORT = 443
  const hasHostname = (url: string | URL) => {
    try {
      const parsedUrl = new URL(url)
      return !!parsedUrl.hostname
    } catch (error) {
      return false
    }
  }

  const setHostnameIfNull = (dest: Destination) => {
    let hostname: string
    if (!hasHostname(dest?.destUri)) {
      hostname = 'https://' + getHostNameFromType(dest)
      return hostname + dest?.destUri
    } else {
      return dest?.destUri
    }
  }

  const testResults: ConnectionTestResult[] = []
  if (!destination) {
    connectionTestResult.destId = 'unknown'
    connectionTestResult.destUrl = 'unknown'
    connectionTestResult.testResults = [
      {
        name: '',
        detail:
          'No tests were run because the requested destination was not found.',
        status: null,
        order: -1,
        message: `The requested destination was not found in our records.`,
        type: '',
      },
    ]
    //throw new Error(`${JSON.stringify(connectionTestResult, null, 3)}`)
  } else if (destination && !isValidUrl(setHostnameIfNull(destination))) {
    connectionTestResult.destId = destination.destId
    connectionTestResult.destUrl = destination.destUri
    connectionTestResult.destType = destination.destinationType.type
    connectionTestResult.jurisdictionDescription =
      destination.jurisdiction?.description
    connectionTestResult.testResults = [
      {
        name: '',
        detail: `No tests were run because the requested destination's URL [ ${destination.destUri} ]is malformed.`,
        status: null,
        order: -1,
        message: `The URL retrieved for ${destination.destId} is malformed`,
        type: '',
      },
    ]

    logger.error('URL for destination is malformed', {
      testResults: connectionTestResult.testResults,
      destination: connectionTestResult.destId,
      destinationType: connectionTestResult.destType,
      url: connectionTestResult.destUrl,
    })
    throw new Error(`${JSON.stringify(connectionTestResult, null, 3)}`)
  } else {
    const IZG_ENDPOINT_CRT_PATH = process.env.IZG_ENDPOINT_CRT_PATH || undefined
    const IZG_ENDPOINT_KEY_PATH = process.env.IZG_ENDPOINT_KEY_PATH || undefined
    const IZG_ENDPOINT_PASSCODE = process.env.IZG_ENDPOINT_PASSCODE || undefined
    const destIdURL = convertUrlStringToUrlObject(
      setHostnameIfNull(destination)
    )

    const connectionTestRequest: ConnectionTestRequest = {
      ip: '',
      port: +destIdURL.port || DEFAULT_PORT,
      url: destIdURL,
      path: destIdURL.pathname,
      order: 0,
      certPath: IZG_ENDPOINT_CRT_PATH,
      keyPath: IZG_ENDPOINT_KEY_PATH,
      passphrase: IZG_ENDPOINT_PASSCODE,
      destinationData: destination,
    }

    logger.info('Starting connection tests', {
      destId: destination.destId,
      hostname: connectionTestRequest.url.hostname,
      port: connectionTestRequest.port,
      userId: user.email,
      operation: 'start_connection_tests',
    })

    let testCounter = 0
    let skipTests = false
    for (const test in testSuiteKeys) {
      ++testCounter
      logger.debug(`Running test number ${testCounter} : ${TestSuite[test]}`)
      let result: ConnectionTestResult[] = [
        {
          name: TestSuite[test],
          status: TestStatus.SKIPPED,
          message: '',
          detail: '',
          order: testCounter,
          type: '',
        },
      ]
      connectionTestRequest.order = testCounter
      try {
        const T = ConnectionTestFactory.getConnectionTest(
          TestSuite[test],
          connectionTestRequest
        )
        const isDex =
          destination.destVersion?.startsWith('DEX') ||
          destination.destVersion?.startsWith('V202')
        if (
          isDex &&
          ['wsdl', 'connectivity', 'qbp'].includes(TestSuite[test])
        ) {
          // Disable WSDL, Connectivity and QBP tests for DEX2.0 and V2022-12-31
          result = await T.skip(
            `Skipping ${TestSuite[test]} test for ADS Endpoints`
          )
        } else if (!skipTests) {
          result = await T.run()
        } else {
          result = await T.skip()
        }
      } catch (error) {
        logger.error('Error running tests', {
          testName: TestSuite[test],
          testType: test,
          errorMessage: error.message,
          errorType: error.name,
          stack: error.stack,
          destinationId: destination.destId,
          destinationType: destination.destinationType,
        })
        result = [
          {
            name: TestSuite[test],
            status: TestStatus.FAIL,
            message: error.message || 'An unexpected error occurred.',
            detail: '',
            order: testCounter,
            type: '',
          },
        ]
      }

      testResults.push(...result)
      const testStatus = result[0]?.status || 'UNKNOWN'
      const testType = TestSuite[test].toUpperCase()
      logger.info(
        `${testType} test ${testStatus} for '${destination.destId}'`,
        {
          testResult: {
            ...result[0],
            username: destination.username,
            destId: destination.destId,
          },
          userContext: {
            name: user.name || 'unknown',
            email: user.email || 'unknown',
            userId: user.id || user.email || 'unknown',
          },
          timestamp: moment().toISOString(true),
        }
      )
      if (result[0]?.status === TestStatus.FAIL) {
        skipTests = true
      }
      if (TestSuite[test] === 'dns') {
        connectionTestRequest.ip = result[0]?.detail
      }
      logger.debug(`Finished test number ${testCounter} : ${TestSuite[test]}`)
    }

    connectionTestResult.destId = destination.destId || 'unknown'
    connectionTestResult.destUrl = destIdURL.hostname || 'unknown'
    connectionTestResult.destType =
      destination.destinationType.type || 'unknown'
    connectionTestResult.jurisdictionDescription =
      destination.jurisdiction?.description || 'unknown'
    connectionTestResult.testResults = testResults
  }
  logger.info('Connection Test Results', {
    connectionTestResult,
  })
  return {
    connectionTestResult,
    numberOfTests,
  }
}
export default connectionTest

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

const getHostNameFromType = (dest: Destination) => {
  const IZG_STATUS_ENDPOINT_URL = process.env.IZG_STATUS_ENDPOINT_URL || ''
  const configuredHubURLs = new IZGHubStatusHistoryEndpoint(
    IZG_STATUS_ENDPOINT_URL
  )
  // if there is no hostname, then the URL is local, and so the endpoint
  // is where you would get status history from for the same destination
  const base = new URL(
    configuredHubURLs.getIZGHubURL(dest.destinationType.typeId)
  )
  const url = new URL(dest.destUri, base)
  return url.host
}
