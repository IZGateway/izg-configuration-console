// Mock data for AccessControl components
// TODO: Replace this with real API calls and data sources

export interface SenderData {
  id: string
  sender: string
  senderDetails: string
  destination: string
  destinationCode: string
  accessLevel: string
  status: string
  lastActive: string
  connectionType: 'production' | 'onboarding'
  isConnected: boolean
}

export interface AccessGroup {
  id: string
  groupName: string
  description: string
  memberCount: number
  roles: string[]
  members: string[]
}

export interface DenyListItem {
  id: string
  name: string
  reason: string
  dateDenied: string
  deniedBy: string
  certificationName?: string
  environment?: 'Production' | 'Onboarding'
}

// Mock data for AccessControl components - simplified examples
export const mockSenderData: SenderData[] = [
  {
    id: 'CDC-ATL-001',
    sender: 'CDC Atlanta IIS',
    senderDetails: 'cdc-atlanta.immunizations.gov',
    destination: 'Georgia GRITS (Onboarding)',
    destinationCode: 'GA-GRITS',
    accessLevel: 'Full Access',
    status: 'Test Validate',
    lastActive: '09/22/2025',
    connectionType: 'onboarding' as const,
    isConnected: true,
  },
  {
    id: 'CDC-ATL-002',
    sender: 'CDC Atlanta IIS',
    senderDetails: 'cdc-atlanta.immunizations.gov',
    destination: 'Georgia GRITS (Production)',
    destinationCode: 'GA-GRITS',
    accessLevel: 'Full Access',
    status: 'Production Live',
    lastActive: '10/10/2025',
    connectionType: 'production' as const,
    isConnected: true,
  },
]

// Mock data for AccessGroups component
export const mockAccessGroups: AccessGroup[] = [
  {
    id: '1',
    groupName: 'Administrators',
    description: 'All hospitals authorized for State A3',
    memberCount: 23,
    roles: ['Admin', 'OPS', 'ADS'],
    members: ['eHealthSign', 'APHL OPS', 'IZG OPS', 'Administrations'],
  },
  {
    id: '2',
    groupName: 'Operating Staff',
    description: 'All hospitals authorized for State A3',
    memberCount: 34,
    roles: ['OPS', 'SOAP'],
    members: ['APHL OPS', 'IZG OPS', 'eHealthSign'],
  },
  {
    id: '3',
    groupName: 'ADS Users',
    description: 'Administrators is added here',
    memberCount: 1,
    roles: ['ADS', 'Admin'],
    members: ['Administrations', 'APHL OPS'],
  },
]

// Mock data for DenyList component
export const mockDenyListData: DenyListItem[] = [
  {
    id: 'BLOCKED-001',
    name: 'Revoked Sender X',
    reason: 'Security violation - unauthorized data transmission',
    dateDenied: '2025-03-20',
    deniedBy: 'admin@izgateway.gov',
    certificationName: 'CERT-2024-001',
    environment: 'Production',
  },
  {
    id: 'BLOCKED-002',
    name: 'Suspicious Entity Y',
    reason: 'Multiple failed authentication attempts',
    dateDenied: '2025-02-15',
    deniedBy: 'security@izgateway.gov',
    certificationName: 'CERT-2024-045',
    environment: 'Onboarding',
  },
  {
    id: 'BLOCKED-003',
    name: 'Compromised System Z',
    reason: 'Detected malicious activity patterns',
    dateDenied: '2025-01-10',
    deniedBy: 'admin@izgateway.gov',
    environment: 'Onboarding',
  },
]

/**
 * API Integration Guide for Developers:
 *
 * To replace mock data with real API data, follow these steps:
 *
 * 1. ACCESS CONTROL SENDER DATA:
 *    - Create API service: fetchProductionSenderData()
 *    - Replace mockSenderData import in AccessControl components
 *    - Ensure API returns SenderData[] format with connectionType: 'production'
 *
 * 2. ACCESS GROUPS DATA:
 *    - Create API service: fetchAccessGroups()
 *    - Replace mockAccessGroups import in AccessGroups component
 *    - Ensure API returns AccessGroup[] format
 *
 * 3. DENY LIST DATA:
 *    - Create API service: fetchDenyListData()
 *    - Replace mockDenyListData import in DenyList component
 *    - Ensure API returns DenyListItem[] format
 *
 * 4. EXAMPLE API SERVICE STRUCTURE:
 *
 *    // services/accessControlApi.ts
 *    export const fetchProductionSenderData = async (): Promise<SenderData[]> => {
 *      const response = await fetch('/api/access-control/senders')
 *      return response.json()
 *    }
 *
 *    export const fetchAccessGroups = async (): Promise<AccessGroup[]> => {
 *      const response = await fetch('/api/access-groups')
 *      return response.json()
 *    }
 *
 *    export const fetchDenyListData = async (): Promise<DenyListItem[]> => {
 *      const response = await fetch('/api/deny-list')
 *      return response.json()
 *    }
 *
 * 5. COMPONENT UPDATES:
 *    - Import API services instead of mock data
 *    - Add loading states and error handling
 *    - Use useEffect to fetch data on component mount
 */
