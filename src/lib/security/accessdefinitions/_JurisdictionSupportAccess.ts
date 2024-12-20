import {
  ManageConnectionsPageAccessControl,
  TestPageAccessControl,
  EditPageAccessControl,
  ChangeRequestPageAccessControl,
  HistoryPageAccessControl,
} from '../../type/PageAccessControls'
import {
  defaultManageConnectionsPageAccessControl,
  defaultTestPageAccessControl,
  defaultEditPageAccessControl,
  defaultChangeRequestPageAccessControl,
  defaultHistoryPageAccessControl,
} from './defaultaccesslevels'
import { PageControls } from '../accesslevel'

const JurisdictionSupportAccess: PageControls = {
  manageconnections: {
    ...defaultManageConnectionsPageAccessControl,
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
}

export default JurisdictionSupportAccess
