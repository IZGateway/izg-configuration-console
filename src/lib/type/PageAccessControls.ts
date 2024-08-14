type EditPageAccessControl = {
  canChangeCredentials: boolean
  canCreateChangeRequest: boolean
  canApproveChangeRequest: boolean
  canSaveDraft: boolean
  canResetDraft: boolean
  canRunDraftConnectionTest: boolean
}

type ManageConnectionsPageAccessControl = {
  canRunConnectionTest: boolean
  canScheduleMaintainance: boolean
  canViewHistory: boolean
  canEditConnection: boolean
  canViewChangeRequest: boolean
}

type TestPageAccessControl = {
  canRunConnectionTest: boolean
}

type ChangeRequestPageAccessControl = {
  canRunHealthCheck: boolean
  canViewJiraTicket: boolean
  canRescheduleRequest: boolean
  canCancelRequest: boolean
  canViewDetails: boolean
  canDeployChange: boolean
}

type HistoryPageAccessControl = {
  canViewChangeRequest: boolean
  canViewConnectionInfo: boolean
  canViewConnectionInfoDetails: boolean
  canViewHubStatusHistory: boolean
  canViewChangeHistory: boolean
}
export type {
  ChangeRequestPageAccessControl,
  EditPageAccessControl,
  HistoryPageAccessControl,
  ManageConnectionsPageAccessControl,
  TestPageAccessControl,
}
