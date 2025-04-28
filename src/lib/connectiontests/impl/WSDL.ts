import ConnectionTest from '../ConnectionTest'
import { ConnectionTestResult } from '../types/ConnectionTestResult'
import { TestStatus } from '../TestStatus'
import { https } from 'follow-redirects'
import { TestResponseMessages } from '../TestResponseMessages'
import path from 'path'
import fs from 'fs'
import { DOMParser } from '@xmldom/xmldom'

export default class WSDL extends ConnectionTest {
  constructor(connectionTestRequest) {
    super(connectionTestRequest)
  }

  run = (): Promise<ConnectionTestResult[]> => {
    const TEST_NAME = `WSDL Test for ${this.connectionTestRequest.url}`
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
      hostname: this.connectionTestRequest.url.hostname,
      port: this.connectionTestRequest.port,
      path: this.connectionTestRequest.path + '?wsdl',
      method: 'GET',
      agent: new https.Agent(httpsAgentOptions),
    }

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let data = ''
        if (res.statusCode === 200) {
          res.on('data', (chunk) => {
            data = data + chunk.toString()
          })

          res.on('end', function () {
            const parser = new DOMParser()
            try {
              const resXmlDoc = parser.parseFromString(data, 'text/xml')
              if (
                resXmlDoc.documentElement.localName == 'definitions' &&
                resXmlDoc.documentElement.namespaceURI ==
                  'http://schemas.xmlsoap.org/wsdl/'
              ) {
                resolve([
                  {
                    ...wsdlConnectionTestResult,
                    detail: resXmlDoc.documentElement.namespaceURI,
                    status: TestStatus.PASS,
                  },
                ])
              } else {
                resolve([
                  {
                    ...wsdlConnectionTestResult,
                    detail: resXmlDoc.documentElement.namespaceURI,
                    message: TestResponseMessages.WSDL_NOT_SUPPORTED(
                      resXmlDoc.documentElement.namespaceURI
                    ),
                    status: TestStatus.FAIL,
                  },
                ])
              }
            } catch (e) {
              resolve([
                {
                  ...wsdlConnectionTestResult,
                  detail: e,
                  message: TestResponseMessages.UNKNOWN_ERROR(options.hostname),
                  status: TestStatus.FAIL,
                },
              ])
            }
          })
        } else {
          resolve([
            {
              ...wsdlConnectionTestResult,
              message: TestResponseMessages.WSDL_NOT_ACCESSED(
                options.hostname + ':' + options.port + options.path
              ),
              status: TestStatus.WARNING,
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
