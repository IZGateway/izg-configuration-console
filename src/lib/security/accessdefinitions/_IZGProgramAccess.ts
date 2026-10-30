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

// IGDD-3547. Values below are taken directly from the "IZG Program" column of
// the Combined Matrix (Confluence 1006043137) — not copied from another role.
//
// No block below carries an `as PageAccessControl` assertion: an assertion
// permits excess properties, so a typo'd flag name (e.g. the correctly-spelled
// but wrong `canScheduleMaintenance` vs. the real `canScheduleMaintainance`)
// would type-check and then be `false` forever. The `RoleAccess` annotation on
// the parent already types every block and restores excess-property checking.
const IZGProgramAccess: RoleAccess = {
  // Target matrix: Tenancy — Reach = All.
  globalTenancy: true,
  manageconnections: {
    ...defaultManageConnectionsPageAccessControl,
    canViewConnections: true,
    canRunConnectionTest: true,
    canScheduleMaintainance: true,
    canViewHistory: true,
    canViewChangeRequest: true,
    canResetCircuitBreaker: true,
  },
  test: {
    ...defaultTestPageAccessControl,
    canRunConnectionTest: true,
  },
  edit: {
    ...defaultEditPageAccessControl,
  },
  changerequest: {
    ...defaultChangeRequestPageAccessControl,
  },
  history: {
    ...defaultHistoryPageAccessControl,
  },
  apikeys: {
    ...defaultApiKeyManagementPageAccessControl,
  },
  onboarding: {
    ...defaultOnboardingPageAccessControl,
    canViewOnboarding: true,
  },

  // Target matrix: "Access Control — view tabs / write actions" is IZG
  // Security only. IZG Program holds neither.
  accesscontrol: {
    ...defaultAccessControlPageAccessControl,
  },

  // Target matrix: "Admin Operations — Circuit Breaker Reset / DB Refresh" is
  // a real grant for IZG Program (unlike IZG Support's same row, which is
  // deferred — see Finding #14 in _IZGSupportAccess.ts — this is a brand new
  // role file, not a pure-removal change, so it is seeded from the matrix
  // directly). `canViewAdminOperations` is set alongside it so the role can
  // reach the page the other two flags act on. Password Encryption remains
  // IZG Security only.
  adminoperations: {
    ...defaultAdminOperationsPageAccessControl,
    canViewAdminOperations: true,
    canResetHubCircuitBreakers: true,
    canRefreshHubDatabase: true,
  },

  // Target matrix: "Admin Log Search (current /console route)" has no ✓ for
  // IZG Program.
  console: {
    ...defaultConsolePageAccessControl,
  },

  // Target matrix: "Swagger API Doc" has no ✓ for IZG Program.
  'api-doc': {
    ...defaultApiDocPageAccessControl,
  },
}

export default IZGProgramAccess
