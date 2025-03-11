import ConnectionTest from '../ConnectionTest'
import { ConnectionTestResult } from '../types/ConnectionTestResult'
import { TestStatus } from '../TestStatus'
import { TestResponseMessages } from '../TestResponseMessages'

export default class DNS extends ConnectionTest {
  jurisdictionUrl: string

  constructor(connectionTestRequest, jurisdictionUrl: string) {
    super(connectionTestRequest)
    this.jurisdictionUrl = jurisdictionUrl
  }

  run = (): Promise<ConnectionTestResult[]> => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dns = require('dns')
    const TEST_NAME = `Verify DNS entry for ${this.jurisdictionUrl}`
    const dnsConnectionTestResult: ConnectionTestResult = {
      name: TEST_NAME,
      order: this.connectionTestRequest.order,
      message: '',
      detail: null,
      status: this.status,
    }

    return new Promise((resolve) => {
      dns.resolve4(
        this.connectionTestRequest.hostname,
        (error: NodeJS.ErrnoException, address: string[]) => {
          resolve([
            {
              ...dnsConnectionTestResult,
              detail: error?.code || address[0],
              message: error
                ? TestResponseMessages.DNS_LOOKUP_FAIL(
                    this.connectionTestRequest.hostname
                  )
                : '',
              status: error ? TestStatus.FAIL : TestStatus.PASS,
            },
          ])
        }
      )
    })
  }
}
