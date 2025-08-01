import { ConnectionTestRequest } from './types/ConnectionTestRequest'
import { ConnectionTestResult } from './types/ConnectionTestResult'
import { TestStatus } from './TestStatus'

export default interface Testable {
  connectionTestRequest: ConnectionTestRequest
  status: TestStatus
  skip: () => Promise<ConnectionTestResult[]>
  run: () => Promise<ConnectionTestResult[]>
}
