import ConnectionTest from '../ConnectionTest'
import { ConnectionTestResult } from '../types/ConnectionTestResult'
import { TestStatus } from '../TestStatus'
import { TestResponseMessages } from '../TestResponseMessages'
import { ConnectionTestRequest } from '../types/ConnectionTestRequest'
import { promises as dnsPromises } from 'dns';

const CONNECTION_TEST_TIMEOUT = process.env.CONNECTION_TEST_TIMEOUT ? parseInt(process.env.CONNECTION_TEST_TIMEOUT, 10) : 5000
const resolver = new dnsPromises.Resolver({
  "timeout": CONNECTION_TEST_TIMEOUT
});
resolver.setServers(['8.8.8.8', '8.8.4.4']); // Set Google's public DNS servers
export default class DNS extends ConnectionTest {
  private readonly TEST_NAME : string
  private dnsConnectionTestResult: ConnectionTestResult 
  constructor(connectionTestRequest: ConnectionTestRequest) {
    super(connectionTestRequest)
    this.TEST_NAME = `Verify DNS entry for ${this.connectionTestRequest.url.hostname}`
    this.dnsConnectionTestResult = {
      name: this.TEST_NAME,
      order: this.connectionTestRequest.order,
      message: '',
      detail: null,
      status: this.status,
      type: 'dns'
    }
  }
  skip = () : Promise<ConnectionTestResult[]> => {
    return Promise.resolve([{
      ...this.dnsConnectionTestResult,
      status: TestStatus.SKIPPED,
      message: 'DNS test skipped due to connectivity test failures'    }])
  }
  run = async (): Promise<ConnectionTestResult[]> => {
    try {
      const addresses = await resolver.resolve4(this.connectionTestRequest.url.hostname)
      this.dnsConnectionTestResult.status = TestStatus.PASS
      this.dnsConnectionTestResult.message = 'DNS Lookup Succeeded'
      this.dnsConnectionTestResult.detail = addresses[0]
      return [this.dnsConnectionTestResult]
    } catch (err) {
      this.dnsConnectionTestResult.status = TestStatus.FAIL
      this.dnsConnectionTestResult.message = TestResponseMessages.DNS_LOOKUP_FAIL(this.connectionTestRequest.url.hostname)
      this.dnsConnectionTestResult.detail = err.code
      return [this.dnsConnectionTestResult]
    }
  }
}
