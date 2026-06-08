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

// Access key must match the page key derived in useRoleAccess (router.pathname with dynamic segments removed), e.g. '/apikeymanagement' -> 'apikeymanagement' (IGDD-2708)
type ApiKeyManagementPageAccessControl = {
  canListApiKeys: boolean
  canCreateApiKey: boolean
  canRevokeApiKey: boolean
  canRenewApiKey: boolean
}

export type {
  ApiKeyManagementPageAccessControl,
  ChangeRequestPageAccessControl,
  EditPageAccessControl,
  HistoryPageAccessControl,
  ManageConnectionsPageAccessControl,
  TestPageAccessControl,
}
