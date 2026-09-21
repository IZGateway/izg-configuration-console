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
  defaultApiKeyManagementPageAccessControl,
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
}

export default SenderOperationsAccess
