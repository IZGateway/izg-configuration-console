import { izgHubRefresh } from './utils/izghubrefresh'

export const withIZGHubRefresh =
  (fn) =>
  async (...args) => {
    const result = await fn(...args)
    izgHubRefresh(args[0])
    console.log('Refreshed')
    return result
  }
