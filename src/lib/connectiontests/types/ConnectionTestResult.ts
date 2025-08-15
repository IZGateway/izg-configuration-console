import { TestStatus } from '../TestStatus'

export type ConnectionTestResult = {
  name: string
  status: TestStatus
  message: string
  detail: string
  order: number
  type: string
}
