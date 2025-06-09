/* eslint-disable @typescript-eslint/no-explicit-any */
import ConnectionTest from '../ConnectionTest'
import { ConnectionTestResult } from '../types/ConnectionTestResult'
import { TestStatus } from '../TestStatus'
import net from 'net'
import { TestResponseMessages } from '../TestResponseMessages'
const CONNECTION_TEST_TIMEOUT = process.env.CONNECTION_TEST_TIMEOUT ? parseInt(process.env.CONNECTION_TEST_TIMEOUT, 10) : 5000
export default class TCP extends ConnectionTest {
  private static readonly TIMEOUT_ERROR_CODE: string = 'ETIMEDOUT'

  constructor(connectionTestRequest) {
    super(connectionTestRequest)
  }

  run = (): Promise<ConnectionTestResult[]> => {
    const TEST_NAME = `TCP Connectivity Test for ${this.connectionTestRequest.url.hostname}`
    const dnsConnectionTestResult: ConnectionTestResult = {
      name: TEST_NAME,
      order: this.connectionTestRequest.order,
      message: '',
      detail: null,
      status: this.status,
    }

    return new Promise((resolve) => {
      const client = new net.Socket()
      client.setTimeout(CONNECTION_TEST_TIMEOUT)
      client.connect(
        this.connectionTestRequest.port,
        this.connectionTestRequest.ip,
        function () {
          resolve([
            {
              ...dnsConnectionTestResult,
              status: TestStatus.PASS,
            },
          ])
        }
      )

      client.on('error', (error: any) => {
        resolve([
          {
            ...dnsConnectionTestResult,
            detail: error?.code,
            message: error
              ? error?.code === TCP.TIMEOUT_ERROR_CODE
                ? TestResponseMessages.TCP_TIMEOUT(
                  this.connectionTestRequest.ip
                )
                : TestResponseMessages.TCP_REJECT(this.connectionTestRequest.ip)
              : '',
            status: TestStatus.FAIL,
          },
        ])
      })
      client.setTimeout(CONNECTION_TEST_TIMEOUT, () => {
        client.destroy();
        resolve([
          {
            ...dnsConnectionTestResult,
            detail: 'ETIMEDOUT',
            message: TestResponseMessages.TCP_TIMEOUT(this.connectionTestRequest.ip),
            status: TestStatus.FAIL,
          },
        ])
      })

      client.end()
    })
  }
}
