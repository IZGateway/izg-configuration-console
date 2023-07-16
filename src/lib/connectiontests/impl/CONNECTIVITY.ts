import ConnectionTest from '../ConnectionTest'
import { ConnectionTestResult } from '../types/ConnectionTestResult'
import { TestStatus } from '../TestStatus'
import https from 'https'
import { TestResponseMessages } from '../TestResponseMessages'
import * as fs from 'fs'
import path from 'path'
import { StatusCodes } from 'http-status-codes'
import * as xml2js from 'xml2js'

const pasrseOptions = {
  explicitArray: false,
  tagNameProcessors: [xml2js.processors.stripPrefix],
}

const parser = new xml2js.Parser(pasrseOptions)

const TEST_NAME = 'Connectivity Test'
export default class CONNECTIVITY extends ConnectionTest {
  run = (): Promise<ConnectionTestResult[]> => {
    const connectivityTestResult: ConnectionTestResult = {
      name: TEST_NAME,
      order: this.connectionTestRequest.order,
      message: '',
      detail: null,
      status: this.status,
    }

    const requestBody = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
      <soap:Header>
      <Action xmlns="http://www.w3.org/2005/08/addressing">urn:cdc:iisb:2014:IISPortType:ConnectivityTestRequest</Action>
      <MessageID xmlns="http://www.w3.org/2005/08/addressing">{{testMessageId}}</MessageID>
      <To xmlns="http://www.w3.org/2005/08/addressing">http://www.w3.org/2005/08/addressing/anonymous</To>
      </soap:Header>
      <soap:Body>
      <ConnectivityTestRequest xmlns="urn:cdc:iisb:2014" xmlns:ns2="urn:cdc:iisb:hub:2014" xmlns:ns3="urn:cdc:iisb:2011">
      <EchoBack>Wishing 
      ${this.connectionTestRequest.hostname} 
      :
      ${this.connectionTestRequest.port}
       an Audacious Hello at
      ${new Date()} 
      !</EchoBack>
      </ConnectivityTestRequest>
      </soap:Body>
      </soap:Envelope>`

    const httpsAgentOptions = {
      cert: fs.readFileSync(
        path.resolve(this.connectionTestRequest.certPath),
        `utf-8`,
      ),
      key: fs.readFileSync(
        path.resolve(this.connectionTestRequest.keyPath),
        'utf-8',
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
        'Content-Type': 'application/xml',
      },
    }

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let data = ''
        let requestEchoback: string
        let responseEchoback: string

        res.on('data', (chunk) => {
          data = data + chunk.toString()
        })

        res.on('end', function () {
          if (res.statusCode === StatusCodes.OK) {
            parser.parseString(data, function (err: Error, result) {
              if (err) {
                resolve([
                  this.unknownErrorResult(connectivityTestResult, err, options),
                ])
              } else {
                responseEchoback =
                  result.Envelope.Body.ConnectivityTestResponse.EchoBack.toString()
              }
            })
            parser.parseString(requestBody, function (_err, result) {
              requestEchoback =
                result.Envelope.Body.ConnectivityTestRequest.EchoBack.toString()
            })

            if (requestEchoback === responseEchoback) {
              resolve([
                {
                  ...connectivityTestResult,
                  detail: responseEchoback,
                  message: null,
                  status: TestStatus.PASS,
                },
              ])
            } else if (responseEchoback?.includes(requestEchoback)) {
              resolve([
                {
                  ...connectivityTestResult,
                  detail: responseEchoback,
                  message: TestResponseMessages.CONNECTIVITY_WARNING(
                    requestEchoback,
                    responseEchoback,
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
                  detail: responseEchoback,
                  message:
                    TestResponseMessages.CONNECTIVITY_ECHOBACK_NOT_EXPECTED,
                  status: TestStatus.FAIL,
                },
              ])
            }
          } else {
            resolve([
              {
                ...connectivityTestResult,
                detail: res.statusCode + ': ' + res.statusMessage,
                message: TestResponseMessages.CONNECTIVITY_NOT_CONNECT,
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
      req.write(requestBody)
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
    },
  ): ConnectionTestResult {
    return {
      ...connectivityTestResult,
      detail: err.message,
      message: TestResponseMessages.UNKNOWN_ERROR(options.hostname),
      status: TestStatus.FAIL,
    }
  }
}
