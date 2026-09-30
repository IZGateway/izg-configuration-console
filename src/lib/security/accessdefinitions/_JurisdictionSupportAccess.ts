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

const JurisdictionSupportAccess: RoleAccess = {
  // Scoped to the jurisdictions in the user's Okta `jurisdictions` claim.
  globalTenancy: false,
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
  // all four surfaces are `isAdmin`-gated and Jurisdiction Support is not in
  // OPERATIONS_GROUP.
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

export default JurisdictionSupportAccess
