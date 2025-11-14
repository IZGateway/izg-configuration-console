export interface DenyListItem {
  id: string
  name: string
  reason?: string
  dateDenied?: string
  deniedBy?: string
  certificationName?: string
  environment: string | number
}
