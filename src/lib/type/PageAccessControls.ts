type EditPageAccessControl = {
  canChangeCredentials: boolean
  canCreateChangeRequest: boolean
  canApproveChangeRequest: boolean
  canSaveDraft: boolean
  canResetDraft: boolean
  canRunDraftConnectionTest: boolean
}

type ManageConnectionsPageAccessControl = {
  // Gates the nav entry and the page itself — deliberately separate from the
  // more granular flags below, which gate actions *within* the page for
  // roles that can already reach it.
  canViewConnections: boolean
  canRunConnectionTest: boolean
  canScheduleMaintainance: boolean
  canViewHistory: boolean
  canEditConnection: boolean
  canViewChangeRequest: boolean
  canResetCircuitBreaker: boolean
}

type OnboardingPageAccessControl = {
  canViewOnboarding: boolean
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

// Access key must match the page key derived in useRoleAccess (router.pathname with dynamic segments removed), e.g. '/apikeys' -> 'apikeys' (IGDD-2708)
type ApiKeyManagementPageAccessControl = {
  canListApiKeys: boolean
  canCreateApiKey: boolean
  canRevokeApiKey: boolean
  canRenewApiKey: boolean
  canCancelApiKey: boolean
}

// Granularity rule for the admin blocks below (IGDD-3472): one flag per page
// entry, plus one flag per independently-mutable resource on it. Not a
// view/create/update/delete quartet — the API surface is already
// resource-shaped and no anticipated role holds delete-but-not-add.
type AccessControlPageAccessControl = {
  // Page entry + nav visibility. Also authorizes the GET half of every
  // Access Control resource route.
  canViewAccessControl: boolean
  canManageAccessGroups: boolean
  canManageDenyList: boolean
  canManageAdsFileTypes: boolean
}

type AdminOperationsPageAccessControl = {
  canViewAdminOperations: boolean
  canManagePasswordEncryption: boolean
  // The *hub-wide* circuit-breaker reset (POST /api/status/reset), deliberately
  // not a reuse of manageconnections.canResetCircuitBreaker, which gates the
  // per-destination reset. One flag for both would silently widen the
  // per-destination permission into a hub-wide one.
  canResetHubCircuitBreakers: boolean
  canRefreshHubDatabase: boolean
}

type ConsolePageAccessControl = {
  // The admin log search at /console only — NOT the status-report widget on the
  // landing page, which is a separate surface.
  canViewConsole: boolean
}

type ApiDocPageAccessControl = {
  canViewApiDoc: boolean
}

export type {
  AccessControlPageAccessControl,
  AdminOperationsPageAccessControl,
  ApiDocPageAccessControl,
  ApiKeyManagementPageAccessControl,
  ChangeRequestPageAccessControl,
  ConsolePageAccessControl,
  EditPageAccessControl,
  HistoryPageAccessControl,
  ManageConnectionsPageAccessControl,
  OnboardingPageAccessControl,
  TestPageAccessControl,
}
