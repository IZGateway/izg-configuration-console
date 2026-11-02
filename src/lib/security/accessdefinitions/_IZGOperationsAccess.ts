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
  // Diverges from the target matrix (Confluence 1006043137, v13): "API Key
  // Management" rows are IZG Security and Jurisdiction Security only. The
  // decision to remove IZG Operations' access belongs to IGDD-3549, so these
  // values are left as they are.
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
    canManageSenders: true,
  } as OnboardingPageAccessControl,

  // The four admin blocks below carry no `as` assertion, deliberately: an
  // assertion permits excess properties, so a typo'd flag name would
  // type-check and then be `false` forever. The `RoleAccess` annotation on the
  // parent already types each property and restores excess-property checking.

  // [PROVISIONAL — IGDD-3472] Reproduces the access IZG Operations had under
  // `isAdmin`. Target matrix (Confluence 1006043137, v13) removes
  // "Access Control — write Access Groups" from IZG Operations; IZG Security,
  // which takes it over, now exists (IGDD-3498). The narrowing is applied
  // separately, once that role's members are in place.
  accesscontrol: {
    ...defaultAccessControlPageAccessControl,
    canViewAccessControl: true,
    canManageAccessGroups: true,
    canManageDenyList: true,
    canManageAdsFileTypes: true,
  },

  // [PROVISIONAL — IGDD-3472] Reproduces the access IZG Operations had under
  // `isAdmin`. Target matrix (v13) rows "Admin Operations — Password
  // Encryption card" and "Password Encryption (standalone page)" are
  // IZG Security only; that role now exists (IGDD-3498) and the narrowing is
  // applied separately. "Circuit Breaker Reset / DB Refresh" matches the
  // matrix.
  adminoperations: {
    ...defaultAdminOperationsPageAccessControl,
    canViewAdminOperations: true,
    canManagePasswordEncryption: true,
    canResetHubCircuitBreakers: true,
    canRefreshHubDatabase: true,
  },

  // Target matrix (v13) row "Admin Log Search (current /console route)"
  // grants IZG Operations. Do not confuse that row with "Console — status
  // report", a separate surface (the Home SystemResourcesWidget) that this
  // flag does not gate.
  console: {
    ...defaultConsolePageAccessControl,
    canViewConsole: true,
  },

  // Diverges from the target matrix (v13): "Swagger API Doc" is IZG Security
  // and the CDC roles, not IZG Operations. The decision to remove IZG
  // Operations' access belongs to IGDD-3550, so the value is left as it is.
  'api-doc': {
    ...defaultApiDocPageAccessControl,
    canViewApiDoc: true,
  },
}

export default IZGOperationsAccess
