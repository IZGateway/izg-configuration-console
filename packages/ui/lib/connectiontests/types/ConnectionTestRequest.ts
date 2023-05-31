export type ConnectionTestRequest = {
  hostname: string
  path: string
  ip: string
  id: string
  port: number
  order: number
  keyPath?: string
  certPath?: string
  passphrase?: string
}
