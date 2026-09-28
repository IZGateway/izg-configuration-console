import {
  ApiKeyManagementPageAccessControl,
  ManageConnectionsPageAccessControl,
  OnboardingPageAccessControl,
  TestPageAccessControl,
  EditPageAccessControl,
  ChangeRequestPageAccessControl,
  HistoryPageAccessControl,
} from '../../type/PageAccessControls'
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

const IZGOperationsAccess: RoleAccess = {
  // IZG Operations sees every jurisdiction (was: hardcoded in accesshelper.ts).
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
  } as ManageConnectionsPageAccessControl,
  test: {
    ...defaultTestPageAccessControl,
    canRunConnectionTest: true,
  } as TestPageAccessControl,
  edit: {
    ...defaultEditPageAccessControl,
    canChangeCredentials: true,
    canCreateChangeRequest: true,
    canApproveChangeRequest: true,
    canSaveDraft: true,
    canResetDraft: true,
    canRunDraftConnectionTest: true,
  } as EditPageAccessControl,
  changerequest: {
    ...defaultChangeRequestPageAccessControl,
    canRunHealthCheck: true,
    canViewJiraTicket: true,
    canRescheduleRequest: true,
    canCancelRequest: true,
    canViewDetails: true,
    canDeployChange: true,
  } as ChangeRequestPageAccessControl,
  history: {
    ...defaultHistoryPageAccessControl,
    canViewChangeRequest: true,
    canViewConnectionInfo: true,
    canViewConnectionInfoDetails: true,
    canViewHubStatusHistory: true,
    canViewChangeHistory: true,
  } as HistoryPageAccessControl,
  apikeys: {
    ...defaultApiKeyManagementPageAccessControl,
    canListApiKeys: true,
    canCreateApiKey: true,
    canRevokeApiKey: true,
    canRenewApiKey: true,
    canCancelApiKey: true,
  } as ApiKeyManagementPageAccessControl,
  onboarding: {
    ...defaultOnboardingPageAccessControl,
    canViewOnboarding: true,
  } as OnboardingPageAccessControl,

  // The four admin blocks below carry no `as` assertion, deliberately: an
  // assertion permits excess properties, so a typo'd flag name would
  // type-check and then be `false` forever. The `RoleAccess` annotation on the
  // parent already types each property and restores excess-property checking.

  // [PROVISIONAL — IGDD-3472] Reproduces today's access exactly: these surfaces
  // are gated on `isAdmin` (Okta group OPERATIONS_GROUP = IZG Operations), so
  // IZG Operations is the only current holder. Target matrix (Keith + Anusha
  // spike, "Part 4 — Combined Matrix") rows "Access Control — view tabs /
  // write actions", "Deny List" and "ADS File Type Mgmt" assign these to
  // `IZG Security`, a role that does not exist in this codebase yet. Seeding
  // `false` here would lock IZG Operations out of a page they use today, so
  // the value diverges from target until that role lands.
  accesscontrol: {
    ...defaultAccessControlPageAccessControl,
    canViewAccessControl: true,
    canManageAccessGroups: true,
    canManageDenyList: true,
    canManageAdsFileTypes: true,
  },

  // [PROVISIONAL — IGDD-3472] Reproduces today's `isAdmin` access. Two
  // divergences from the target matrix, both deliberate:
  //  - "Admin Ops — Password Encryption card" and the standalone Password
  //    Encryption page assign to `IZG Security` (absent role) — same reason as
  //    the accesscontrol block above.
  //  - "Admin Ops — CB Reset / DB Refresh" grants `IZG Support` as well
  //    (Finding #14). That is a real *widening*, deferred to its own ticket so
  //    IGDD-3472 only ever removes access. Four flags in `_IZGSupportAccess.ts`
  //    when it lands, with no code change — which is the proof this
  //    infrastructure works.
  adminoperations: {
    ...defaultAdminOperationsPageAccessControl,
    canViewAdminOperations: true,
    canManagePasswordEncryption: true,
    canResetHubCircuitBreakers: true,
    canRefreshHubDatabase: true,
  },

  // [PROVISIONAL — IGDD-3472] Reproduces today's `isAdmin` access to the admin
  // log search. Target matrix row "Admin Log Search (current /console route)"
  // also grants `IZG Support`; deferred with Finding #14 above. Do not confuse
  // that row with "Console — status report", a separate surface (the Home
  // SystemResourcesWidget) that this flag does not gate.
  console: {
    ...defaultConsolePageAccessControl,
    canViewConsole: true,
  },

  // [PROVISIONAL — IGDD-3472] Reproduces today's access: the /api-doc nav link
  // is `isAdmin`-gated. Target matrix row "Swagger API Doc" assigns to
  // `IZG Security` + the CDC roles, all absent, and Keith marks the row
  // **Unconfirmed** — so there is no settled target to diverge toward yet.
  'api-doc': {
    ...defaultApiDocPageAccessControl,
    canViewApiDoc: true,
  },
}

export default IZGOperationsAccess
