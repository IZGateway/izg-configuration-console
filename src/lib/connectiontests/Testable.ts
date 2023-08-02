import { ConnectionTestRequest } from './types/ConnectionTestRequest'
import { ConnectionTestResult } from './types/ConnectionTestResult'
import { TestStatus } from './TestStatus'

export default interface Testable {
  connectionTestRequest: ConnectionTestRequest
  status: TestStatus
  run: () => Promise<ConnectionTestResult[]>
}
