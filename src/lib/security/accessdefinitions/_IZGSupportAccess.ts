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

const IZGSupportAccess: RoleAccess = {
  // IZG Support sees every jurisdiction (was: hardcoded in accesshelper.ts).
  // Note it holds NO apikeys permissions — global reach without API-key rights is
  // exactly why reach must be evaluated per role, never merged. See policy.ts.
  globalTenancy: true,
  manageconnections: {
    ...defaultManageConnectionsPageAccessControl,
    canViewConnections: true,
    canRunConnectionTest: true,
    canViewHistory: true,
    canViewChangeRequest: true,
  } as ManageConnectionsPageAccessControl,
  test: {
    ...defaultTestPageAccessControl,
    canRunConnectionTest: true,
  } as TestPageAccessControl,
  edit: {
    ...defaultEditPageAccessControl,
  } as EditPageAccessControl,
  changerequest: {
    ...defaultChangeRequestPageAccessControl,
    canRunHealthCheck: true,
    canViewDetails: true,
  } as ChangeRequestPageAccessControl,
  history: {
    ...defaultHistoryPageAccessControl,
    canViewChangeHistory: true,
    canViewChangeRequest: true,
    canViewConnectionInfo: true,
    canViewConnectionInfoDetails: true,
    canViewHubStatusHistory: true,
  } as HistoryPageAccessControl,
  apikeys: {
    ...defaultApiKeyManagementPageAccessControl,
  } as ApiKeyManagementPageAccessControl,
  onboarding: {
    ...defaultOnboardingPageAccessControl,
    canViewOnboarding: true,
  } as OnboardingPageAccessControl,

  // The four admin blocks below carry no `as` assertion, deliberately: an
  // assertion permits excess properties, so a typo'd flag name would
  // type-check and then be `false` forever. The `RoleAccess` annotation on the
  // parent already types each property and restores excess-property checking.

  // [PROVISIONAL — IGDD-3472] Every admin surface is denied outright. Spreading
  // the all-false defaults and adding nothing is what makes that deny
  // deliberate rather than incidental. These reproduce today's access exactly:
  // all four surfaces are `isAdmin`-gated and IZG Support is not in
  // OPERATIONS_GROUP.
  // The target matrix grants IZG Support `canViewAdminOperations`,
  // `canResetHubCircuitBreakers`, `canRefreshHubDatabase` (Finding #14) and
  // `canViewConsole`. Deferred to its own ticket: applying them here would
  // make IGDD-3472 grant access as well as remove it, costing the change the
  // property that makes it reviewable as a pure security fix.
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

export default IZGSupportAccess
