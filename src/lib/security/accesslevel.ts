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
  [role: string]: PageControls
}

export type PageControls = {
  manageconnections: ManageConnectionsPageAccessControl
  test: TestPageAccessControl
  edit: EditPageAccessControl
  changerequest: ChangeRequestPageAccessControl
  history: HistoryPageAccessControl
  // Key must match the page key derived in useRoleAccess (router.pathname with dynamic segments removed): e.g. '/apikeys' -> 'apikeys' (IGDD-2708)
  apikeys: ApiKeyManagementPageAccessControl
}
