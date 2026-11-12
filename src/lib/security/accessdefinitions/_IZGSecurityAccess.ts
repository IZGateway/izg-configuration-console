import {
  defaultAccessControlPageAccessControl,
  defaultAdminOperationsPageAccessControl,
  defaultApiDocPageAccessControl,
  defaultApiKeyManagementPageAccessControl,
  defaultConsolePageAccessControl,
  defaultManageConnectionsPageAccessControl,
  defaultOnboardingPageAccessControl,
  defaultTestPageAccessControl,
  defaultEditPageAccessControl,
  defaultChangeRequestPageAccessControl,
  defaultHistoryPageAccessControl,
} from './defaultaccesslevels'
import { RoleAccess } from '../accesslevel'

// IGDD-3498. The "IZG Security" column of the Combined Matrix (Confluence
// 1006043137, version 13) has a ✓ on every CC row and Reach = All: "Has all
// capabilities in CC and Hub".
//
// Every flag is written out by name over the all-false defaults rather than
// computed, and not spread from another role. A capability added later stays
// `false` here until someone decides to grant it, and narrowing IZG Operations
// cannot silently narrow this role too.
//
// No block below carries an `as PageAccessControl` assertion: an assertion
// permits excess properties, so a typo'd flag name would type-check and then be
// `false` forever. The `RoleAccess` annotation on the parent already types every
// block and restores excess-property checking.
const IZGSecurityAccess: RoleAccess = {
  // Target matrix: Tenancy — Reach = All.
  globalTenancy: true,
  manageconnections: {
    ...defaultManageConnectionsPageAccessControl,
    canViewConnections: true,
    canRunConnectionTest: true,
    canScheduleMaintainance: true,
    canViewHistory: true,
    canEditConnection: true,
    canViewChangeRequest: true,
    canResetCircuitBreaker: true,
  },
  test: {
    ...defaultTestPageAccessControl,
    canRunConnectionTest: true,
  },
  edit: {
    ...defaultEditPageAccessControl,
    canChangeCredentials: true,
    canCreateChangeRequest: true,
    canApproveChangeRequest: true,
    canSaveDraft: true,
    canResetDraft: true,
    canRunDraftConnectionTest: true,
  },
  changerequest: {
    ...defaultChangeRequestPageAccessControl,
    canRunHealthCheck: true,
    canViewJiraTicket: true,
    canRescheduleRequest: true,
    canCancelRequest: true,
    canViewDetails: true,
    canDeployChange: true,
  },
  history: {
    ...defaultHistoryPageAccessControl,
    canViewConnectionInfo: true,
    canViewConnectionInfoDetails: true,
    canViewHubStatusHistory: true,
    canViewChangeHistory: true,
  },
  apikeys: {
    ...defaultApiKeyManagementPageAccessControl,
    canListApiKeys: true,
    canCreateApiKey: true,
    canRevokeApiKey: true,
    canRenewApiKey: true,
    canCancelApiKey: true,
  },
  onboarding: {
    ...defaultOnboardingPageAccessControl,
    canViewOnboarding: true,
    canManageSenders: true,
  },
  accesscontrol: {
    ...defaultAccessControlPageAccessControl,
    canViewAccessControl: true,
    canManageAccessGroups: true,
    canManageDenyList: true,
    canManageAdsFileTypes: true,
  },
  adminoperations: {
    ...defaultAdminOperationsPageAccessControl,
    canViewAdminOperations: true,
    canManagePasswordEncryption: true,
    canResetHubCircuitBreakers: true,
    canRefreshHubDatabase: true,
    canViewDeepHealthCheckDetail: true,
  },
  console: {
    ...defaultConsolePageAccessControl,
    canViewConsole: true,
  },
  'api-doc': {
    ...defaultApiDocPageAccessControl,
    canViewApiDoc: true,
  },
}

export default IZGSecurityAccess
