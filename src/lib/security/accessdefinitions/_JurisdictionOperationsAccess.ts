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

const JurisdictionOperationsAccess: RoleAccess = {
  // Scoped to the jurisdictions in the user's Okta `jurisdictions` claim.
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
    canRescheduleRequest: true,
    canCancelRequest: true,
    canViewDetails: true,
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
    canManageSenders: true,
  } as OnboardingPageAccessControl,

  // The four admin blocks below carry no `as` assertion, deliberately: an
  // assertion permits excess properties, so a typo'd flag name would
  // type-check and then be `false` forever. The `RoleAccess` annotation on the
  // parent already types each property and restores excess-property checking.

  // [PROVISIONAL — IGDD-3472] accesscontrol, adminoperations and api-doc are
  // denied outright. Spreading the all-false defaults and adding nothing is
  // what makes that deny deliberate rather than incidental. These reproduce
  // today's access exactly: those surfaces are `isAdmin`-gated and
  // Jurisdiction Operations is not in OPERATIONS_GROUP.
  accesscontrol: {
    ...defaultAccessControlPageAccessControl,
  },
  adminoperations: {
    ...defaultAdminOperationsPageAccessControl,
  },
  // [IGDD-3474] Admin Log Search (/console), own jurisdiction only — target
  // matrix v11. Safe for a scoped role because /api/console/metrics builds the
  // query server-side and checks reach on the selected destination per role.
  console: {
    ...defaultConsolePageAccessControl,
    canViewConsole: true,
  },
  'api-doc': {
    ...defaultApiDocPageAccessControl,
  },
}

export default JurisdictionOperationsAccess
