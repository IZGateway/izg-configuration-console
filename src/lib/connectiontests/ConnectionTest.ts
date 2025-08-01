import Testable from './Testable'
import { ConnectionTestRequest } from './types/ConnectionTestRequest'
import { ConnectionTestResult } from './types/ConnectionTestResult'
import { TestStatus } from './TestStatus'

export default abstract class ConnectionTest implements Testable {
  connectionTestRequest: ConnectionTestRequest
  status: TestStatus
  constructor(connectionTestRequest: ConnectionTestRequest) {
    this.connectionTestRequest = connectionTestRequest
    this.status = TestStatus.SKIPPED
  }
  abstract skip: () => Promise<ConnectionTestResult[]>
  abstract run: () => Promise<ConnectionTestResult[]>
}
