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

const SenderOperationsAccess: RoleAccess = {
  // A sender only ever reaches its own organization's data — never every
  // jurisdiction's, unlike the IZG-tier roles.
  globalTenancy: false,
  // Every IIS-only page is denied outright: a sender has no role in managing
  // IIS connections, change requests, or hub-status history. Spreading the
  // all-false default and adding nothing here is what makes that deny
  // deliberate rather than incidental.
  manageconnections: {
    ...defaultManageConnectionsPageAccessControl,
  } as ManageConnectionsPageAccessControl,
  test: {
    ...defaultTestPageAccessControl,
  } as TestPageAccessControl,
  edit: {
    ...defaultEditPageAccessControl,
  } as EditPageAccessControl,
  changerequest: {
    ...defaultChangeRequestPageAccessControl,
  } as ChangeRequestPageAccessControl,
  history: {
    ...defaultHistoryPageAccessControl,
  } as HistoryPageAccessControl,
  // Full lifecycle over its own credentials, scoped by the same per-role
  // jurisdiction check every other role goes through (see policy.ts) — this
  // is not a wider capability than Jurisdiction Operations, only a narrower
  // reach.
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
  } as OnboardingPageAccessControl,

  // The four admin blocks below carry no `as` assertion, deliberately: an
  // assertion permits excess properties, so a typo'd flag name would
  // type-check and then be `false` forever. The `RoleAccess` annotation on the
  // parent already types each property and restores excess-property checking.

  // [PROVISIONAL — IGDD-3472] Every admin surface is denied outright. Spreading
  // the all-false defaults and adding nothing is what makes that deny
  // deliberate rather than incidental. These reproduce today's access exactly:
  // all four surfaces are `isAdmin`-gated and Sender Operations is not in
  // OPERATIONS_GROUP.
  // The target matrix has no column for Sender Operations at all — it is
  // slated for retirement, folded into `Jurisdiction Security`. Do not invest
  // in its admin values.
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

export default SenderOperationsAccess
