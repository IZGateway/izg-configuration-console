import { ConnectionTestResult } from './ConnectionTestResult'

export type APIResponse = {
  destId: string | string[]
  destUrl: string
  destType: string
  jurisdictionDescription: string
  testResults: ConnectionTestResult[]
}
