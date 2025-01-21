/* eslint-disable @typescript-eslint/no-explicit-any */
export type ConnectionTestRequest = {
  hostname: string
  path: string
  ip: string
  id: string
  desttypeid: number
  port: number
  order: number
  keyPath?: string
  certPath?: string
  passphrase?: string
  destinationData: any
}
