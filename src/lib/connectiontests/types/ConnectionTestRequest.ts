import { Destination } from '../../type/Destination'

export type ConnectionTestRequest = {
  url: URL
  path: string
  ip: string
  port: number
  order: number
  keyPath?: string
  certPath?: string
  passphrase?: string
  destinationData: Destination
}
