import { TestStatus } from '../TestStatus'

export type ConnectionTestResult = {
  name: string
  status: TestStatus
  message: string
  detail:
    | string
    | []
    | { response?: string | string[]; statuscode?: number; message?: string }
  order: number
}
