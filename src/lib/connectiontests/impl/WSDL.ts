import ConnectionTest from '../ConnectionTest'
import { ConnectionTestResult } from '../types/ConnectionTestResult'
import { TestStatus } from '../TestStatus'
import https from 'https'
import { TestResponseMessages } from '../TestResponseMessages'
import path from 'path'
import fs from 'fs'
import xml2js from 'xml2js'
const parser = new xml2js.Parser()

const TEST_NAME = 'WSDL Test'
export default class WSDL extends ConnectionTest {
  run = (): Promise<ConnectionTestResult[]> => {
    const wsdlConnectionTestResult: ConnectionTestResult = {
      name: TEST_NAME,
      order: this.connectionTestRequest.order,
      message: '',
      detail: null,
      status: this.status,
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
      path: this.connectionTestRequest.path + '?wsdl',
      method: 'GET',
      agent: new https.Agent(httpsAgentOptions),
    }

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let data = ''
        let targetNameSpace = ''
        if (res.statusCode === 200) {
          res.on('data', (chunk) => {
            data = data + chunk.toString()
          })

          res.on('end', function () {
            parser.parseString(data, function (err, result) {
              if (err) {
                resolve([
                  {
                    ...wsdlConnectionTestResult,
                    detail: err?.message,
                    message: TestResponseMessages.UNKNOWN_ERROR(
                      options.hostname
                    ),
                    status: TestStatus.FAIL,
                  },
                ])
              } else {
                targetNameSpace =
                  result.definitions.$.targetNamespace.toString()
                if (
                  targetNameSpace === 'urn:cdc:iisb:2014' ||
                  targetNameSpace === 'urn:cdc:iisb:2011'
                ) {
                  resolve([
                    {
                      ...wsdlConnectionTestResult,
                      detail: targetNameSpace,
                      status: TestStatus.PASS,
                    },
                  ])
                } else {
                  resolve([
                    {
                      ...wsdlConnectionTestResult,
                      detail: targetNameSpace,
                      message:
                        TestResponseMessages.WSDL_NOT_SUPPORTED(
                          targetNameSpace
                        ),
                      status: TestStatus.FAIL,
                    },
                  ])
                }
              }
            })
          })
        } else {
          resolve([
            {
              ...wsdlConnectionTestResult,
              message: TestResponseMessages.WSDL_NOT_ACCESSED(
                options.hostname + ':' + options.port + options.path
              ),
              status: TestStatus.FAIL,
            },
          ])
        }
      })

      req.on('error', (error) => {
        resolve([
          {
            ...wsdlConnectionTestResult,
            detail: error?.message,
            message: TestResponseMessages.UNKNOWN_ERROR(options.hostname),
            status: TestStatus.FAIL,
          },
        ])
      })

      req.end()
    })
  }
}
