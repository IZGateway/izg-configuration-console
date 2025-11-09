// Mock data for Onboarding components
// TODO: Replace this with real API calls and data sources

export interface SenderData {
  id: string
  sender: string
  senderDetails: string
  destination: string
  destinationCode: string
  accessLevel: string
  status: string
  lastUpdated: string
  connectionType: 'production' | 'onboarding'
  isConnected: boolean
  msh3: string
  msh4: string
  facilityId: string
}

// Mock data for Onboarding components - simplified examples
export const mockSenderData: SenderData[] = [
  {
    id: 'CDC-ATL-001',
    sender: 'CDC Atlanta IIS',
    senderDetails: 'cdc-atlanta.immunizations.gov',
    destination: 'Georgia GRITS (Onboarding)',
    destinationCode: 'GA-GRITS',
    accessLevel: 'Full Access',
    status: 'Test Validate',
    lastUpdated: '09/22/2025',
    connectionType: 'onboarding' as const,
    isConnected: true,
    msh3: 'CDC_ATLANTA_IIS',
    msh4: 'CDC',
    facilityId: 'ATL-001',
  },
  {
    id: 'CDC-ATL-002',
    sender: 'CDC Atlanta IIS',
    senderDetails: 'cdc-atlanta.immunizations.gov',
    destination: 'Georgia GRITS (Production)',
    destinationCode: 'GA-GRITS',
    accessLevel: 'Full Access',
    status: 'Production Live',
    lastUpdated: '10/15/2025',
    connectionType: 'production' as const,
    isConnected: true,
    msh3: 'CDC_ATLANTA_IIS_PROD',
    msh4: 'CDC',
    facilityId: 'ATL-002',
  },
  {
    id: 'CDC-ATL-003',
    sender: 'CDC Atlanta IIS',
    senderDetails: 'cdc-atlanta.immunizations.gov',
    destination: 'Georgia GRITS (Production)',
    destinationCode: 'GA-GRITS',
    accessLevel: 'Full Access',
    status: 'Production Live',
    lastUpdated: '10/15/2025',
    connectionType: 'production' as const,
    isConnected: true,
    msh3: 'CDC_ATLANTA_IIS_PROD',
    msh4: 'CDC',
    facilityId: 'ATL-002',
  },
  {
    id: 'CDC-ATL-004',
    sender: 'CDC Atlanta IIS',
    senderDetails: 'cdc-atlanta.immunizations.gov',
    destination: 'Georgia GRITS (Production)',
    destinationCode: 'GA-GRITS',
    accessLevel: 'Full Access',
    status: 'Production Live',
    lastUpdated: '10/15/2025',
    connectionType: 'production' as const,
    isConnected: true,
    msh3: 'CDC_ATLANTA_IIS_PROD',
    msh4: 'CDC',
    facilityId: 'ATL-002',
  },
  {
    id: 'CDC-ATL-005',
    sender: 'CDC Atlanta IIS',
    senderDetails: 'cdc-atlanta.immunizations.gov',
    destination: 'Georgia GRITS (Production)',
    destinationCode: 'GA-GRITS',
    accessLevel: 'Full Access',
    status: 'Production Live',
    lastUpdated: '10/15/2025',
    connectionType: 'production' as const,
    isConnected: true,
    msh3: 'CDC_ATLANTA_IIS_PROD',
    msh4: 'CDC',
    facilityId: 'ATL-002',
  },
  {
    id: 'CDC-ATL-006',
    sender: 'CDC Atlanta IIS',
    senderDetails: 'cdc-atlanta.immunizations.gov',
    destination: 'Georgia GRITS (Production)',
    destinationCode: 'GA-GRITS',
    accessLevel: 'Full Access',
    status: 'Production Live',
    lastUpdated: '10/15/2025',
    connectionType: 'production' as const,
    isConnected: true,
    msh3: 'CDC_ATLANTA_IIS_PROD',
    msh4: 'CDC',
    facilityId: 'ATL-002',
  },
  {
    id: 'CDC-ATL-007',
    sender: 'CDC Atlanta IIS',
    senderDetails: 'cdc-atlanta.immunizations.gov',
    destination: 'Georgia GRITS (Production)',
    destinationCode: 'GA-GRITS',
    accessLevel: 'Full Access',
    status: 'Production Live',
    lastUpdated: '10/15/2025',
    connectionType: 'production' as const,
    isConnected: true,
    msh3: 'CDC_ATLANTA_IIS_PROD',
    msh4: 'CDC',
    facilityId: 'ATL-002',
  },
  {
    id: 'CDC-ATL-008',
    sender: 'CDC Atlanta IIS',
    senderDetails: 'cdc-atlanta.immunizations.gov',
    destination: 'Georgia GRITS (Production)',
    destinationCode: 'GA-GRITS',
    accessLevel: 'Full Access',
    status: 'Production Live',
    lastUpdated: '10/15/2025',
    connectionType: 'production' as const,
    isConnected: true,
    msh3: 'CDC_ATLANTA_IIS_PROD',
    msh4: 'CDC',
    facilityId: 'ATL-002',
  },
  {
    id: 'CDC-ATL-009',
    sender: 'CDC Atlanta IIS',
    senderDetails: 'cdc-atlanta.immunizations.gov',
    destination: 'Georgia GRITS (Production)',
    destinationCode: 'GA-GRITS',
    accessLevel: 'Full Access',
    status: 'Production Live',
    lastUpdated: '10/15/2025',
    connectionType: 'production' as const,
    isConnected: true,
    msh3: 'CDC_ATLANTA_IIS_PROD',
    msh4: 'CDC',
    facilityId: 'ATL-002',
  },
  {
    id: 'CDC-ATL-010',
    sender: 'CDC Atlanta IIS',
    senderDetails: 'cdc-atlanta.immunizations.gov',
    destination: 'Georgia GRITS (Production)',
    destinationCode: 'GA-GRITS',
    accessLevel: 'Full Access',
    status: 'Production Live',
    lastUpdated: '10/15/2025',
    connectionType: 'production' as const,
    isConnected: true,
    msh3: 'CDC_ATLANTA_IIS_PROD',
    msh4: 'CDC',
    facilityId: 'ATL-002',
  },
  {
    id: 'CDC-ATL-011',
    sender: 'CDC Atlanta IIS',
    senderDetails: 'cdc-atlanta.immunizations.gov',
    destination: 'Georgia GRITS (Production)',
    destinationCode: 'GA-GRITS',
    accessLevel: 'Full Access',
    status: 'Production Live',
    lastUpdated: '10/15/2025',
    connectionType: 'production' as const,
    isConnected: true,
    msh3: 'CDC_ATLANTA_IIS_PROD',
    msh4: 'CDC',
    facilityId: 'ATL-002',
  },
]

/**
 * API Integration Guide for Developers:
 *
 * To replace mock data with real API data, follow these steps:
 *
 * 1. ONBOARDING SENDER DATA:
 *    - Create API service: fetchOnboardingSenderData()
 *    - Replace mockSenderData import in Onboarding components
 *    - Ensure API returns SenderData[] format with connectionType: 'onboarding'
 *
 * 2. EXAMPLE API SERVICE STRUCTURE:
 *
 *    // services/onboardingApi.ts
 *    export const fetchOnboardingSenderData = async (): Promise<SenderData[]> => {
 *      const response = await fetch('/api/onboarding/senders')
 *      return response.json()
 *    }
 *
 * 3. COMPONENT UPDATES:
 *    - Import API services instead of mock data
 *    - Add loading states and error handling
 *    - Use useEffect to fetch data on component mount
 */
