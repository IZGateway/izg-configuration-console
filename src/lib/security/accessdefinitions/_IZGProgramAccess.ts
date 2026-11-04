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
  // canViewHistory and canViewChangeRequest are deliberately NOT set here
  // despite the matrix showing ✓ on "Manage Connections — view
  // history/change request" for IZG Program. Both flags double as the
  // visibility switch for a link into the /history and /changerequest pages
  // (popOverActionButtons.tsx, ChangeRequestActionButtons.tsx), and this
  // role's "History — all view flags" / "Change Request — view details" rows
  // are both "—" — the only role in the matrix where these two groups of
  // cells disagree. Setting the Manage Connections flags true renders a
  // button that always Access-Denies. Until the matrix's intent is
  // clarified, false avoids shipping a broken affordance; false is also the
  // narrower, AC-compliant reading ("no more... than the matrix grants").
  manageconnections: {
    ...defaultManageConnectionsPageAccessControl,
    canViewConnections: true,
    canRunConnectionTest: true,
    canScheduleMaintainance: true,
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

  // Target matrix (v13): every "Access Control" row is IZG Security and
  // IZG Operations only. IZG Program holds none of them.
  accesscontrol: {
    ...defaultAccessControlPageAccessControl,
  },

  // Target matrix: "Admin Operations — Circuit Breaker Reset / DB Refresh" is
  // a real grant for IZG Program, seeded from the matrix directly (IZG Support
  // holds the same row since IGDD-3498). `canViewAdminOperations` is set
  // alongside it so the role can reach the page the other two flags act on.
  // Password Encryption remains IZG Security only.
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
