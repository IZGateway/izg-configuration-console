/* eslint-disable @typescript-eslint/no-explicit-any */
import { izgHubRefresh } from './utils/izghubrefresh'

interface FunctionWithArgs {
  (...args: any[]): Promise<any>
}

export const withIZGHubRefresh =
  (fn: FunctionWithArgs) =>
  async (...args: any[]): Promise<any> => {
    const result = await fn(...args)
    izgHubRefresh(args[0])
    return result
  }
