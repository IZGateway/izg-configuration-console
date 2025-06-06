import ConnectionTest from '../ConnectionTest'
import { ConnectionTestResult } from '../types/ConnectionTestResult'
import { TestStatus } from '../TestStatus'
import { TestResponseMessages } from '../TestResponseMessages'
import { ConnectionTestRequest } from '../types/ConnectionTestRequest'
const CONNECTION_TEST_TIMEOUT = process.env.CONNECTION_TEST_TIMEOUT ? parseInt(process.env.CONNECTION_TEST_TIMEOUT, 10) : 5000
export default class DNS extends ConnectionTest {
  constructor(connectionTestRequest: ConnectionTestRequest) {
    super(connectionTestRequest)
  }

  run = (): Promise<ConnectionTestResult[]> => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dns = require('dns')
    const TEST_NAME = `Verify DNS entry for ${this.connectionTestRequest.url.hostname}`
    const dnsConnectionTestResult: ConnectionTestResult = {
      name: TEST_NAME,
      order: this.connectionTestRequest.order,
      message: '',
      detail: null,
      status: this.status,
    }

    const dnsPromise = new Promise<ConnectionTestResult[]>((resolve) => {
      dns.resolve4(
        this.connectionTestRequest.url.hostname,
        (error: NodeJS.ErrnoException, address: string[]) => {
          resolve([
            {
              ...dnsConnectionTestResult,
              detail: error?.code || address?.[0],
              message: error
                ? TestResponseMessages.DNS_LOOKUP_FAIL(this.connectionTestRequest.url.hostname)
                : '',
              status: error ? TestStatus.FAIL : TestStatus.PASS,
            },
          ])
        }
      )
    })

    const timeoutPromise = new Promise<ConnectionTestResult[]>((resolve) => {
      setTimeout(() => {
        resolve([
          {
            ...dnsConnectionTestResult,
            detail: 'ETIMEDOUT',
            message: `DNS resolution timed out after ${CONNECTION_TEST_TIMEOUT}ms`,
            status: TestStatus.FAIL,
          },
        ])
      }, CONNECTION_TEST_TIMEOUT)
    })

    return Promise.race([dnsPromise, timeoutPromise])
  }
}
