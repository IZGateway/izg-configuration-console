import {
  ApiKeyManagementPageAccessControl,
  ManageConnectionsPageAccessControl,
  TestPageAccessControl,
  EditPageAccessControl,
  ChangeRequestPageAccessControl,
  HistoryPageAccessControl,
} from '../type/PageAccessControls'
import {
  IZGOperationsAccess,
  JurisdictionOperationsAccess,
  IZGSupportAccess,
  JurisdictionSupportAccess,
} from './accessdefinitions'

const accessLevel: AccessLevel = {
  'IZG Operations': IZGOperationsAccess,
  'IZG Support': IZGSupportAccess,
  'Jurisdiction Support': JurisdictionSupportAccess,
  'Jurisdiction Operations': JurisdictionOperationsAccess,
}
export default accessLevel

type AccessLevel = {
  [role: string]: RoleAccess
}

/**
 * A role definition: its per-page permissions plus its tenancy reach.
 *
 * `globalTenancy` used to be a hardcoded role-name list duplicated in two places
 * (`accesshelper.ts` and `accessutils.ts`). Expressing it as matrix data means
 * adding a globally-scoped role is a data change rather than an edit to
 * authorization logic, and there is one list instead of two that can drift.
 *
 * Critically, it is read *per role* inside the policy loop and never merged
 * across roles — see `policy.ts`. Merging reach across roles is what would let a
 * user combine one role's permission with another role's global reach.
 */
export type RoleAccess = PageControls & {
  /** True if this role sees every jurisdiction's data, bypassing prefix scoping. */
  globalTenancy: boolean
}

/** Page keys in the access matrix (excludes the `globalTenancy` scalar). */
export type PageKey = keyof PageControls

export type PageControls = {
  manageconnections: ManageConnectionsPageAccessControl
  test: TestPageAccessControl
  edit: EditPageAccessControl
  changerequest: ChangeRequestPageAccessControl
  history: HistoryPageAccessControl
  // Key must match the page key derived in useRoleAccess (router.pathname with dynamic segments removed): e.g. '/apikeys' -> 'apikeys' (IGDD-2708)
  apikeys: ApiKeyManagementPageAccessControl
}
