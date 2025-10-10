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
}

export interface AccessGroup {
  id: string
  groupName: string
  description: string
  userCount: number
  roles: string[]
}

export interface DenyListItem {
  id: string
  name: string
  reason: string
  dateDenied: string
  deniedBy: string
}

// Mock data for OnboardSender component
export const mockSenderData: SenderData[] = [
  {
    id: 'CDC-ATL-001',
    sender: 'CDC Atlanta IIS',
    senderDetails: 'cdc-atlanta.immunizations.gov',
    destination: 'Georgia GRITS (Onboarding)',
    destinationCode: 'GA-GRITS',
    accessLevel: 'Full Access',
    status: 'Approved',
    lastActive: '09/22/2025',
  },
  {
    id: 'FL-SHOTS-001',
    sender: 'Florida SHOTS',
    senderDetails: 'fl-shots.health.state.fl.us',
    destination: 'CDC AIRA Hub (Production)',
    destinationCode: 'CDC-AIRA-HUB',
    accessLevel: 'No Access',
    status: 'Draft',
    lastActive: '07/01/2025',
  },
  {
    id: 'CA-CALLA-001',
    sender: 'CALLA',
    senderDetails: 'cal-la.immunizations.gov',
    destination: 'CDC AIRA Hub (Production)',
    destinationCode: 'CDC-AIRA-HUB',
    accessLevel: 'Testing Only',
    status: 'Disconnect',
    lastActive: '06/21/2025',
  },
]

// Mock data for AccessGroups component
export const mockAccessGroups: AccessGroup[] = [
  {
    id: '1',
    groupName: 'Administrators',
    description: 'All hospitals authorized for State A3',
    userCount: 23,
    roles: ['Admin (5)', 'Super User (18)'],
  },
  {
    id: '2',
    groupName: 'Operating Staff',
    description: 'All hospitals authorized for State A3',
    userCount: 34,
    roles: ['Standard (34)'],
  },
  {
    id: '3',
    groupName: 'ADS Users',
    description: 'Administrators is added here',
    userCount: 1,
    roles: ['Basic (1)'],
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
  },
  {
    id: 'BLOCKED-002',
    name: 'Suspicious Entity Y',
    reason: 'Multiple failed authentication attempts',
    dateDenied: '2025-02-15',
    deniedBy: 'security@izgateway.gov',
  },
  {
    id: 'BLOCKED-003',
    name: 'Compromised System Z',
    reason: 'Detected malicious activity patterns',
    dateDenied: '2025-01-10',
    deniedBy: 'admin@izgateway.gov',
  },
]

/**
 * API Integration Guide for Developers:
 *
 * To replace mock data with real API data, follow these steps:
 *
 * 1. ONBOARD SENDER DATA:
 *    - Create API service: fetchSenderData()
 *    - Replace mockSenderData import in OnboardSender component
 *    - Ensure API returns SenderData[] format
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
 *    export const fetchSenderData = async (): Promise<SenderData[]> => {
 *      const response = await fetch('/api/senders')
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
