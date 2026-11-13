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

// IGDD-3500. The "Jurisdiction Security" column of the Combined Matrix
// (Confluence 1006043137, version 14): the jurisdiction staff who obtain
// credentials for their sending and receiving systems. It takes API key
// management over from Jurisdiction Operations, and holds everything else
// Jurisdiction Operations does except Admin Log Search, plus approving a
// change request.
//
// Every flag is written out by name over the all-false defaults rather than
// spread from another role, so narrowing Jurisdiction Operations cannot
// silently narrow this role too.
//
// No block below carries an `as PageAccessControl` assertion: an assertion
// permits excess properties, so a typo'd flag name would type-check and then be
// `false` forever. The `RoleAccess` annotation on the parent already types every
// block and restores excess-property checking.
const JurisdictionSecurityAccess: RoleAccess = {
  // Target matrix: Tenancy — Reach = Own Jurisdiction. Scoped to the
  // jurisdictions in the user's Okta `jurisdictions` claim.
  globalTenancy: false,
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
  // Target matrix: "view Jira ticket" and "deploy change" are IZG roles only.
  changerequest: {
    ...defaultChangeRequestPageAccessControl,
    canRunHealthCheck: true,
    canRescheduleRequest: true,
    canCancelRequest: true,
    canViewDetails: true,
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

  // Target matrix: Access Control, Admin Operations, Admin Log Search
  // (/console) and Swagger API Doc have no ✓ for Jurisdiction Security.
  accesscontrol: {
    ...defaultAccessControlPageAccessControl,
  },
  adminoperations: {
    ...defaultAdminOperationsPageAccessControl,
  },
  console: {
    ...defaultConsolePageAccessControl,
  },
  'api-doc': {
    ...defaultApiDocPageAccessControl,
  },
}

export default JurisdictionSecurityAccess
