import {
  ApiKeyManagementPageAccessControl,
  EditPageAccessControl,
  ManageConnectionsPageAccessControl,
  TestPageAccessControl,
  ChangeRequestPageAccessControl,
  HistoryPageAccessControl,
} from '../../type/PageAccessControls'

const defaultEditPageAccessControl: EditPageAccessControl = {
  canChangeCredentials: false,
  canCreateChangeRequest: false,
  canApproveChangeRequest: false,
  canSaveDraft: false,
  canResetDraft: false,
  canRunDraftConnectionTest: false,
}

const defaultManageConnectionsPageAccessControl: ManageConnectionsPageAccessControl =
  {
    canRunConnectionTest: false,
    canScheduleMaintainance: false,
    canViewHistory: false,
    canEditConnection: false,
    canViewChangeRequest: false,
    canResetCircuitBreaker: false,
  }

const defaultTestPageAccessControl: TestPageAccessControl = {
  canRunConnectionTest: false,
}

const defaultChangeRequestPageAccessControl: ChangeRequestPageAccessControl = {
  canRunHealthCheck: false,
  canViewJiraTicket: false,
  canRescheduleRequest: false,
  canCancelRequest: false,
  canViewDetails: false,
  canDeployChange: false,
}

const defaultHistoryPageAccessControl: HistoryPageAccessControl = {
  canViewChangeRequest: false,
  canViewConnectionInfo: false,
  canViewConnectionInfoDetails: false,
  canViewHubStatusHistory: false,
  canViewChangeHistory: false,
}

const defaultApiKeyManagementPageAccessControl: ApiKeyManagementPageAccessControl =
  {
    canListApiKeys: false,
    canCreateApiKey: false,
    canRevokeApiKey: false,
    canRenewApiKey: false,
  }

export {
  defaultApiKeyManagementPageAccessControl,
  defaultChangeRequestPageAccessControl,
  defaultEditPageAccessControl,
  defaultHistoryPageAccessControl,
  defaultManageConnectionsPageAccessControl,
  defaultTestPageAccessControl,
}
