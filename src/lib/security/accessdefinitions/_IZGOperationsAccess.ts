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
  // Target matrix (Confluence 1006043137, v13): "Edit Connection — approve
  // change request" is IZG Security and Jurisdiction Security only, so
  // `canApproveChangeRequest` stays at the default `false` (IGDD-3498). No code
  // reads that flag until IGDD-3545, so removing it changes nothing a user sees
  // yet.
  edit: {
    ...defaultEditPageAccessControl,
    canChangeCredentials: true,
    canCreateChangeRequest: true,
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

  // Target matrix (v13), Access Control split by tab: IZG Operations views all
  // three tabs and writes the Deny List and ADS File Types. "Write Access
  // Groups" is IZG Security only, so `canManageAccessGroups` stays at the
  // default `false` (IGDD-3498).
  accesscontrol: {
    ...defaultAccessControlPageAccessControl,
    canViewAccessControl: true,
    canManageDenyList: true,
    canManageAdsFileTypes: true,
  },

  // Target matrix (v13): "Circuit Breaker Reset / DB Refresh" grants IZG
  // Operations. "Password Encryption card" and "Password Encryption
  // (standalone page)" are IZG Security only, so `canManagePasswordEncryption`
  // stays at the default `false` (IGDD-3498).
  adminoperations: {
    ...defaultAdminOperationsPageAccessControl,
    canViewAdminOperations: true,
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
