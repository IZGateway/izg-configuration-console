import ConnectionTest from '../ConnectionTest'
import { ConnectionTestResult } from '../types/ConnectionTestResult'
import { TestStatus } from '../TestStatus'
import https from 'https'
import { TestResponseMessages } from '../TestResponseMessages'
import { prismacontext } from '../../prismacontext'
import * as fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { DOMParser, Document } from '@xmldom/xmldom'

const randomUUID = uuidv4()
const TEST_NAME = 'Connectivity Test'
export default class CONNECTIVITY extends ConnectionTest {
  run = async (): Promise<ConnectionTestResult[]> => {
    const connectivityTestResult: ConnectionTestResult = {
      name: TEST_NAME,
      order: this.connectionTestRequest.order,
      message: '',
      detail: null,
      status: this.status,
    }
    const destination = this.connectionTestRequest.destinationData
    const destinationVersion = await lookupDestinationVersion(
      destination,
      this.connectionTestRequest.id,
      this.connectionTestRequest.desttypeid
    )
    const setRequestBody = (version: string) => {
      if (version === '2011') {
        return `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:cdc:iisb:2011">
        <soap:Header>
        <Action xmlns="http://www.w3.org/2005/08/addressing">urn:cdc:iisb:2011:connectivityTest</Action>
        <MessageID xmlns="http://www.w3.org/2005/08/addressing">${randomUUID}</MessageID>
        <To xmlns="http://www.w3.org/2005/08/addressing">http://www.w3.org/2005/08/addressing/anonymous</To>
        </soap:Header>
        <soap:Body>
        <connectivityTest xmlns="urn:cdc:iisb:2011">
            <echoBack>Wishing ${this.connectionTestRequest.hostname} : ${
          this.connectionTestRequest.port
        } an Audacious Hello at ${new Date()} !</echoBack>
        </connectivityTest>
        </soap:Body>
        </soap:Envelope>`
      } else {
        return `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
        <soap:Header>
        <Action xmlns="http://www.w3.org/2005/08/addressing">urn:cdc:iisb:2014:IISPortType:ConnectivityTestRequest</Action>
        <MessageID xmlns="http://www.w3.org/2005/08/addressing">${randomUUID}</MessageID>
        <To xmlns="http://www.w3.org/2005/08/addressing">http://www.w3.org/2005/08/addressing/anonymous</To>
        </soap:Header>
        <soap:Body>
        <ConnectivityTestRequest xmlns="urn:cdc:iisb:2014">
            <EchoBack>Wishing ${this.connectionTestRequest.hostname} : ${
          this.connectionTestRequest.port
        } an Audacious Hello at ${new Date()} !</EchoBack>
        </ConnectivityTestRequest>
        </soap:Body>
        </soap:Envelope>`
      }
    }

    const setContentType = (version: string) => {
      if (version === '2011') {
        return `text/xml`
      } else {
        return `application/soap+xml;charset=UTF-8;action="urn:cdc:iisb:2014:IISPortType:ConnectivityTestRequest"`
      }
    }

    const httpsAgentOptions = {
      cert: fs.readFileSync(
        path.resolve(this.connectionTestRequest.certPath),
        `utf-8`
      ),
      key: fs.readFileSync(
        path.resolve(this.connectionTestRequest.keyPath),
        'utf-8'
      ),
      passphrase: this.connectionTestRequest.passphrase,
      rejectUnauthorized: false,
      keepAlive: true,
    }

    const options = {
      hostname: this.connectionTestRequest.hostname,
      port: this.connectionTestRequest.port,
      path: this.connectionTestRequest.path,
      method: 'POST',
      agent: new https.Agent(httpsAgentOptions),
      headers: {
        Host: this.connectionTestRequest.hostname,
        'Content-Type': setContentType(destinationVersion),
      },
    }

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let data = ''

        //if (res.statusCode === StatusCodes.OK) {
        res.on('data', (chunk) => {
          data = data + chunk.toString()
        })

        res.on('end', function () {
          const parser = new DOMParser()
          try {
            const resXmlDoc = parser.parseFromString(data, 'text/xml')
            const reqXmlDoc = parser.parseFromString(
              setRequestBody(destinationVersion),
              'text/xml'
            )
            if (docHasBody(resXmlDoc)) {
              processBody(resXmlDoc, reqXmlDoc, resolve, connectivityTestResult)
            } else {
              resolve([
                {
                  ...connectivityTestResult,
                  detail: data,
                  message: TestResponseMessages.CONNECTIVITY_NO_BODY,
                  status: TestStatus.FAIL,
                },
              ])
            }
          } catch (err) {
            resolve([
              {
                ...connectivityTestResult,
                detail: data,
                message: `Error parsing response: ${err}`,
                status: TestStatus.FAIL,
              },
            ])
          }
        })
      })

      req.on('error', (error) => {
        resolve([
          this.unknownErrorResult(connectivityTestResult, error, options),
        ])
      })

      req.write(setRequestBody(destinationVersion))
      req.end()
    })
  }

  private unknownErrorResult(
    connectivityTestResult: ConnectionTestResult,
    err: Error,
    options: {
      hostname: string
      port: number
      path: string
      method: string
      agent: https.Agent
      headers: { Host: string; 'Content-Type': string }
    }
  ): ConnectionTestResult {
    return {
      ...connectivityTestResult,
      detail: err.message,
      message: TestResponseMessages.UNKNOWN_ERROR(options.hostname),
      status: TestStatus.FAIL,
    }
  }
}

function docHasBody(resXmlDoc: Document) {
  try {
    return (
      resXmlDoc.documentElement.getElementsByTagNameNS('*', 'Body').length > 0
    )
  } catch (err) {
    return false
  }
}

function processBody(
  resXmlDoc: Document,
  reqXmlDoc: Document,
  resolve: (
    value: ConnectionTestResult[] | PromiseLike<ConnectionTestResult[]>
  ) => void,
  connectivityTestResult: ConnectionTestResult
) {
  try {
    const responseEchoback = (
      resXmlDoc.documentElement.getElementsByTagNameNS(
        '*',
        'Body'
      )[0] as unknown as Element
    ).textContent.trim()
    const requestEchoback = (
      reqXmlDoc.documentElement.getElementsByTagNameNS(
        '*',
        'Body'
      )[0] as unknown as Element
    ).textContent.trim()

    if (requestEchoback === responseEchoback) {
      resolve([
        {
          ...connectivityTestResult,
          detail: `Request Echoback: ${requestEchoback} | Response Echoback ${responseEchoback}`,
          message: null,
          status: TestStatus.PASS,
        },
      ])
    } else if (responseEchoback?.includes(requestEchoback)) {
      resolve([
        {
          ...connectivityTestResult,
          detail: `Request Echoback: ${requestEchoback} | Response Echoback ${responseEchoback}`,
          message: TestResponseMessages.CONNECTIVITY_WARNING(
            requestEchoback,
            responseEchoback
          ),
          status: TestStatus.WARNING,
        },
      ])
    } else if (
      requestEchoback !== responseEchoback ||
      !responseEchoback?.includes(requestEchoback)
    ) {
      resolve([
        {
          ...connectivityTestResult,
          detail: `Request Echoback: ${requestEchoback} | Response Echoback ${responseEchoback}`,
          message: TestResponseMessages.CONNECTIVITY_ECHOBACK_NOT_EXPECTED,
          status: TestStatus.FAIL,
        },
      ])
    }
  } catch (err) {
    resolve([
      {
        ...connectivityTestResult,
        detail: err,
        message: TestResponseMessages.CONNECTIVITY_ECHOBACK_NOT_EXPECTED,
        status: TestStatus.FAIL,
      },
    ])
  }
}

async function lookupDestinationVersion(
  destination: any,
  destId: any,
  destType: any
) {
  if (destination.dest_version) {
    return destination.dest_version
  } else {
    const result = await prismacontext.prisma.$queryRaw`SELECT dest_version
    FROM destinations d
    WHERE d.dest_id = ${destId}
    AND d.dest_type = ${destType}`
    if (result[0].dest_version === '') {
      return '2014'
    } else {
      return result[0].dest_version
    }
  }
}
