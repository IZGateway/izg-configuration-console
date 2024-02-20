import logger from '../../../logger'
import ConnectionTestFactory from './ConnectionTestFactory'
import { TestStatus } from './TestStatus'
import { ConnectionTestRequest } from './types/ConnectionTestRequest'
import { ConnectionTestResult } from './types/ConnectionTestResult'
import fs from 'fs'
import forge from 'node-forge'

const connectionTest = async (destination: any, userId: string) => {
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
    user: userId,
    timestamp: new Date(Date.now()).toISOString(),
    destId: destination.dest_id,
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
  const DEFAULT_PORT = 443
  const hasHostname = (url) => {
    try {
      const parsedUrl = new URL(url)
      return !!parsedUrl.hostname
    } catch (error) {
      return false
    }
  }

  const setHostnameIfNull = (url) => {
    let hostname
    if (!hasHostname(url)) {
      hostname = 'https://' + getHostNameFromCert()
      return hostname + url
    } else {
      return url
    }
  }

  const testResults: ConnectionTestResult[] = []
  let desttypeid
  let destType
  let jurisdictionDescription
  const changeRequestDestination = destination?.destinations
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
      },
    ]
    throw new Error(`${JSON.stringify(connectionTestResult, null, 3)}`)
  } else if (
    destination &&
    !isValidUrl(setHostnameIfNull(destination.dest_uri))
  ) {
    if (changeRequestDestination) {
      destType = destination?.destinations.destination_type.type
      jurisdictionDescription =
        destination?.destinations.jurisdiction.description
    } else {
      destType = destination?.destination_type.type
      jurisdictionDescription = destination.jurisdiction.description
    }
    connectionTestResult.destId = destination.dest_id as string
    connectionTestResult.destUrl = destination.dest_uri
    connectionTestResult.destType =
      destination.destination_type.type ||
      destination.destionations.destination_type.type
    connectionTestResult.jurisdictionDescription =
      destination.jurisdiction?.description ||
      destination.destinations?.jurisdiction.description
    connectionTestResult.testResults = [
      {
        name: '',
        detail:
          "No tests were run because the requested destination's URL is malformed.",
        status: null,
        order: -1,
        message: `The URL retrieved for ${destination.dest_id} is malformed`,
      },
    ]
    throw new Error(`${JSON.stringify(connectionTestResult, null, 3)}`)
  } else {
    const IZG_ENDPOINT_CRT_PATH = process.env.IZG_ENDPOINT_CRT_PATH || undefined
    const IZG_ENDPOINT_KEY_PATH = process.env.IZG_ENDPOINT_KEY_PATH || undefined
    const IZG_ENDPOINT_PASSCODE = process.env.IZG_ENDPOINT_PASSCODE || undefined

    if (changeRequestDestination) {
      desttypeid = destination.destinations.destination_type.type_id
      destType = destination?.destinations.destination_type.type
      jurisdictionDescription =
        destination?.destinations.jurisdiction.description
    } else {
      desttypeid = destination.destination_type.type_id
      destType = destination?.destination_type.type
      jurisdictionDescription = destination.jurisdiction.description
    }
    const destIdURL = convertUrlStringToUrlObject(
      setHostnameIfNull(destination?.dest_uri)
    )

    const connectionTestRequest: ConnectionTestRequest = {
      ip: '',
      port: +destIdURL.port || DEFAULT_PORT,
      hostname: destIdURL.hostname,
      path: destIdURL.pathname,
      id: destination.dest_id as string,
      desttypeid: desttypeid,
      order: 0,
      certPath: IZG_ENDPOINT_CRT_PATH,
      keyPath: IZG_ENDPOINT_KEY_PATH,
      passphrase: IZG_ENDPOINT_PASSCODE,
      destinationData: destination,
    }

    logger.info(
      `STARTING TESTS ON DEST ID: ${destination.dest_id} USING URL: ${connectionTestRequest.hostname} ON PORT: ${connectionTestRequest.port} INITIATED BY: ${userId}`
    )

    let testCounter = 0
    let skipTests = false
    for (const test in testSuiteKeys) {
      ++testCounter

      let result: ConnectionTestResult[] = [
        {
          name: TestSuite[test],
          status: TestStatus.SKIPPED,
          message: '',
          detail: '',
          order: testCounter,
        },
      ]
      connectionTestRequest.order = testCounter
      if (!skipTests) {
        const T = ConnectionTestFactory.getConnectionTest(
          TestSuite[test],
          connectionTestRequest
        )
        result = await T.run()
      }

      testResults.push(...result)
      if (TestSuite.dns || TestSuite.tcp) {
        if (result[0]?.status === TestStatus.FAIL) {
          skipTests = true
        }
        connectionTestRequest.ip = result[0]?.detail
      }
    }

    connectionTestResult.destId = destination.dest_id || 'unknown'
    connectionTestResult.destUrl = destIdURL.hostname || 'unknown'
    connectionTestResult.destType = destType
    connectionTestResult.jurisdictionDescription = jurisdictionDescription
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

const getHostNameFromCert = () => {
  let hostname = ''
  try {
    const certPem = fs.readFileSync(process.env.IZG_ENDPOINT_CRT_PATH, 'utf8')
    const cert = forge.pki.certificateFromPem(certPem)

    const subjectAttributes = cert.subject.attributes
    for (const attribute of subjectAttributes) {
      if (attribute.shortName === 'CN') {
        hostname = attribute.value
        break
      }
    }
  } catch (error) {
    console.error('Error reading certificate for hostname:', error)
  }
  return hostname
}
